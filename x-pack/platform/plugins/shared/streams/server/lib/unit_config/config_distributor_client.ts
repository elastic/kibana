/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { request as httpRequest } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import YAML from 'yaml';
import type { Logger } from '@kbn/logging';
import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import type { StreamsUnit } from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import type { UnitConfigHooks, UnitCredential } from './types';

export interface ConfigDistributorClientConfig {
  url?: string;
  ssl: {
    certificatePath?: string;
    keyPath?: string;
    certificateAuthoritiesPath?: string;
  };
}

export type ConfigDistributorClient = Required<Pick<UnitConfigHooks, 'publish' | 'validate'>>;

export type UnitDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface UnitDiagnostic {
  severity: UnitDiagnosticSeverity;
  code: string;
  message: string;
  path?: string;
  line?: number;
}

const REQUEST_TIMEOUT_MS = 30_000;

const serializeUnitYaml = (unit: StreamsUnit.Configuration): string => YAML.stringify(unit);

const hashUnitPublishPayload = (unitYaml: string, credentials: UnitCredential[]): string => {
  const hash = createHash('sha256').update(unitYaml, 'utf8');

  if (credentials.length > 0) {
    // Distributor stores `config_hash` without recomputing it. Hashing
    // credential ciphertext as well means a secret-only change still rolls
    // out instead of matching the previous YAML-only hash and no-op'ing.
    const fingerprint = [...credentials]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(({ name, ciphertext }) => [name, ciphertext]);
    hash.update('\n');
    hash.update(JSON.stringify(fingerprint));
  }

  return hash.digest('hex');
};

type DistributorFetch = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  }
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

const createDistributorTls = (
  ssl: ConfigDistributorClientConfig['ssl']
): HttpsAgent | undefined => {
  if (!ssl.certificatePath && !ssl.keyPath && !ssl.certificateAuthoritiesPath) {
    return undefined;
  }

  const tlsConfig = new SslConfig(
    sslSchema.validate({
      enabled: Boolean(ssl.certificatePath && ssl.keyPath),
      certificate: ssl.certificatePath,
      key: ssl.keyPath,
      certificateAuthorities: ssl.certificateAuthoritiesPath,
    })
  );

  // A dedicated Agent is required. TLS fields on https.request() are ignored
  // when Node uses https.globalAgent, which Kibana/ES customize.
  return new HttpsAgent({
    cert: tlsConfig.certificate,
    key: tlsConfig.key,
    ca: tlsConfig.certificateAuthorities,
    rejectUnauthorized: true,
    allowPartialTrustChain: true,
  });
};

const nodeHttpFetch = (agent: HttpsAgent | undefined): DistributorFetch => {
  return async (url, init) => {
    const parsed = new URL(url);
    const requestFn = parsed.protocol === 'http:' ? httpRequest : httpsRequest;

    return await new Promise((resolve, reject) => {
      const req = requestFn(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port,
          path: `${parsed.pathname}${parsed.search}`,
          method: init.method,
          headers: {
            ...init.headers,
            'content-length': String(Buffer.byteLength(init.body)),
          },
          signal: init.signal,
          ...(parsed.protocol === 'https:'
            ? {
                agent,
                servername: parsed.hostname,
              }
            : {}),
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          res.on('end', () => {
            const status = res.statusCode ?? 0;
            const text = Buffer.concat(chunks).toString('utf8');
            resolve({
              ok: status >= 200 && status < 300,
              status,
              text: async () => text,
            });
          });
        }
      );

      req.on('error', reject);
      req.write(init.body);
      req.end();
    });
  };
};

export const createConfigDistributorClient = ({
  config,
  logger,
  hooks = {},
  fetchImpl,
}: {
  config: ConfigDistributorClientConfig;
  logger: Logger;
  hooks?: Pick<UnitConfigHooks, 'encryptCredentials'>;
  fetchImpl?: DistributorFetch;
}): ConfigDistributorClient => {
  const baseUrl = config.url?.replace(/\/$/, '');

  if (!baseUrl) {
    return {
      publish: async () => {
        logger.debug('streams-config-distributor URL is not configured; skipping unit publish.');
      },
      validate: async () => {
        logger.debug('streams-config-distributor URL is not configured; skipping unit validation.');
      },
    };
  }

  const ssl = config.ssl ?? {};
  const agent = createDistributorTls(ssl);

  if (baseUrl.startsWith('https:') && !ssl.certificateAuthoritiesPath) {
    logger.warn(
      'streams-config-distributor URL is HTTPS but xpack.streams.configDistributor.ssl.certificateAuthoritiesPath is not set; TLS verification will fail against a local CA.'
    );
  }

  const requestWithTls = fetchImpl ?? nodeHttpFetch(agent);

  const request = async ({
    path,
    method,
    body,
  }: {
    path: string;
    method: string;
    body: string;
  }): Promise<{ ok: boolean; status: number; text: string }> => {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await requestWithTls(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body,
        signal: abortController.signal,
      });

      return {
        ok: response.ok,
        status: response.status,
        text: await response.text(),
      };
    } catch (error) {
      throw statusErrorFromFetchFailure(baseUrl, error, ssl);
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    publish: async ({ unitId, unit, secrets }) => {
      const unitYaml = serializeUnitYaml(unit);
      const credentials =
        Object.keys(secrets).length > 0
          ? await encryptSecretsForDistributor(hooks.encryptCredentials, secrets)
          : [];
      const configHash = hashUnitPublishPayload(unitYaml, credentials);

      logger.debug(`Publishing Streams unit [${unitId}] to config distributor`);

      const response = await request({
        path: `/v1/units/${encodeURIComponent(unitId)}`,
        method: 'PUT',
        body: JSON.stringify({
          unit_yaml: unitYaml,
          config_hash: configHash,
          ...(credentials.length > 0 ? { credentials } : {}),
        }),
      });

      if (!response.ok) {
        throw statusErrorFromDistributorResponse(
          `Failed to publish Streams unit [${unitId}] to config distributor`,
          response
        );
      }
    },
    validate: async (unit) => {
      const unitYaml = serializeUnitYaml(unit);

      logger.debug('Validating Streams unit with config distributor');

      const response = await request({
        path: '/v1/validate',
        method: 'POST',
        body: JSON.stringify({ unit_yaml: unitYaml }),
      });

      const parsed = parseValidateResponse(response.text);

      if (parsed?.valid) {
        return;
      }

      if (parsed) {
        throw unitValidationError(parsed.diagnostics);
      }

      throw statusErrorFromDistributorResponse('Failed to validate Streams unit', response);
    },
  };
};

const encryptSecretsForDistributor = async (
  encryptCredentials: UnitConfigHooks['encryptCredentials'],
  secrets: StreamsUnit.Secrets
): Promise<UnitCredential[]> => {
  if (!encryptCredentials) {
    throw new StatusError(
      'Cannot publish Streams unit credentials: project-key encryption is not configured.',
      503
    );
  }

  const credentials = await encryptCredentials(secrets);
  const secretNames = Object.keys(secrets).sort();
  const credentialNames = credentials.map((credential) => credential.name).sort();

  if (
    secretNames.length !== credentialNames.length ||
    secretNames.some((name, index) => name !== credentialNames[index])
  ) {
    throw new StatusError(
      'Cannot publish Streams unit credentials: encryption did not return one ciphertext per secret.',
      500
    );
  }

  return credentials;
};

const statusErrorFromDistributorResponse = (
  prefix: string,
  response: { ok: boolean; status: number; text: string }
): StatusError => {
  return new StatusError(
    `${prefix}: ${response.status} ${response.text}`,
    response.status >= 400 && response.status < 500 ? response.status : 502
  );
};

/** Include `error.cause` when Node nests the OpenSSL reason under the request error. */
const formatNetworkError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const causeMessage = error.cause instanceof Error ? error.cause.message : undefined;
  return causeMessage ? `${error.message}: ${causeMessage}` : error.message;
};

const statusErrorFromFetchFailure = (
  baseUrl: string,
  error: unknown,
  ssl: ConfigDistributorClientConfig['ssl']
): StatusError => {
  const detail = formatNetworkError(error);
  const missingCaHint =
    !ssl.certificateAuthoritiesPath &&
    /unable to verify the first certificate|unable to get (local )?issuer certificate/i.test(detail)
      ? ' Set xpack.streams.configDistributor.ssl.certificateAuthoritiesPath to the distributor CA.'
      : '';

  return new StatusError(
    `Failed to reach streams-config-distributor at ${baseUrl}: ${detail}.${missingCaHint}`,
    502
  );
};

const unitValidationError = (diagnostics: UnitDiagnostic[]): StatusError => {
  const errorMessages = diagnostics
    .filter((diagnostic) => diagnostic.severity === 'error')
    .map((diagnostic) => diagnostic.message);
  const error = new StatusError(
    errorMessages.length > 0 ? errorMessages.join('; ') : 'Streams unit is invalid.',
    400
  );
  error.data = { valid: false, diagnostics };
  return error;
};

const parseValidateResponse = (
  text: string
): { valid: boolean; diagnostics: UnitDiagnostic[] } | undefined => {
  try {
    const parsed: unknown = JSON.parse(text);

    if (!isRecord(parsed) || typeof parsed.valid !== 'boolean') {
      return undefined;
    }

    const diagnostics = parsed.diagnostics;

    return {
      valid: parsed.valid,
      diagnostics: Array.isArray(diagnostics)
        ? diagnostics.flatMap((diagnostic) => {
            const mapped = toUnitDiagnostic(diagnostic);
            return mapped ? [mapped] : [];
          })
        : [],
    };
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toUnitDiagnostic = (value: unknown): UnitDiagnostic | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const { severity, code, message, path, line } = value;

  if (
    (severity !== 'error' && severity !== 'warning' && severity !== 'info') ||
    typeof code !== 'string' ||
    typeof message !== 'string'
  ) {
    return undefined;
  }

  return {
    severity,
    code,
    message,
    ...(typeof path === 'string' ? { path } : {}),
    ...(typeof line === 'number' ? { line } : {}),
  };
};
