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
import { combineAbortSignals } from './combine_abort_signals';
import { createTargetIdResolver, type ResolveTargetId } from './distributor_target_id';
import type { UnitConfigHooks, UnitCredential, UnitValidationResult } from './types';

export interface ConfigDistributorClientConfig {
  url?: string;
  ssl: {
    certificate?: string;
    key?: string;
    certificateAuthorities?: string;
  };
}

export type ConfigDistributorClient = Required<Pick<UnitConfigHooks, 'publish' | 'validate'>> & {
  /** The `target_id` the distributor derives from this client's certificate. */
  resolveTargetId: ResolveTargetId;
};

export type UnitDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface UnitDiagnostic {
  severity: UnitDiagnosticSeverity;
  code: string;
  message: string;
  path?: string;
  line?: number;
}

const REQUEST_TIMEOUT_MS = 30_000;

const VALIDATE_PATH = '/v1/units/validate';
// Distributors before streams-config-distributor#441 serve validate here. Drop once every target runs #441.
const LEGACY_VALIDATE_PATH = '/v1/validate';

const serializeUnitYaml = (unit: StreamsUnit.Configuration): string => YAML.stringify(unit);

// The streams-config-distributor docs recipe. Unchanged secrets keep their stored blob, so the hash is stable.
const hashUnitPublishPayload = (unitYaml: string, credentials: UnitCredential[]): string => {
  const hash = createHash('sha256').update(unitYaml, 'utf8');

  if (credentials.length > 0) {
    const pairs = [...credentials]
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .map(({ name, ciphertext }) => [name, ciphertext]);
    hash.update(`\n${JSON.stringify(pairs)}`, 'utf8');
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
): { agent?: HttpsAgent; certificate?: string } => {
  if (!ssl.certificate && !ssl.key && !ssl.certificateAuthorities) {
    return {};
  }

  const tlsConfig = new SslConfig(
    sslSchema.validate({
      enabled: Boolean(ssl.certificate && ssl.key),
      certificate: ssl.certificate,
      key: ssl.key,
      certificateAuthorities: ssl.certificateAuthorities,
    })
  );

  // A dedicated Agent is required. TLS fields on https.request() are ignored
  // when Node uses https.globalAgent, which Kibana/ES customize.
  const agent = new HttpsAgent({
    cert: tlsConfig.certificate,
    key: tlsConfig.key,
    ca: tlsConfig.certificateAuthorities,
    rejectUnauthorized: true,
    allowPartialTrustChain: true,
  });

  // The same PEM the agent presents, so the sealing target cannot drift from the TLS identity.
  return { agent, certificate: tlsConfig.certificate };
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
          res.on('error', reject);
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
  fallbackTargetId,
  fetchImpl,
}: {
  config: ConfigDistributorClientConfig;
  logger: Logger;
  /** Used as `target_id` only when no client certificate is configured (local fake distributor). */
  fallbackTargetId?: string;
  fetchImpl?: DistributorFetch;
}): ConfigDistributorClient => {
  const baseUrl = config.url?.replace(/\/$/, '');

  if (!baseUrl) {
    const distributorNotConfigured = (): never => {
      const message =
        'streams-config-distributor URL is not configured; skipping unit validation and publish.';
      logger.error(message);
      throw new StatusError(message, 503);
    };

    return {
      publish: async (): Promise<void> => distributorNotConfigured(),
      validate: async (): Promise<UnitValidationResult> => distributorNotConfigured(),
      resolveTargetId: distributorNotConfigured,
    };
  }

  const ssl = config.ssl ?? {};
  const { agent, certificate } = createDistributorTls(ssl);
  const resolveTargetId = createTargetIdResolver({ certificate, fallbackTargetId, logger });

  if (baseUrl.startsWith('https:') && !ssl.certificateAuthorities) {
    logger.warn(
      'streams-config-distributor URL is HTTPS but xpack.streams.distributor.ssl.certificateAuthorities is not set; TLS verification will fail against a local CA.'
    );
  }

  const requestWithTls = fetchImpl ?? nodeHttpFetch(agent);

  const request = async ({
    path,
    method,
    body,
    signal,
  }: {
    path: string;
    method: string;
    body: string;
    signal?: AbortSignal;
  }): Promise<{ ok: boolean; status: number; text: string }> => {
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
    const requestSignal = combineAbortSignals([timeoutController.signal, signal]);

    try {
      const response = await requestWithTls(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body,
        signal: requestSignal.signal,
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
      requestSignal.dispose();
    }
  };

  return {
    publish: async ({ unitId, unit, credentials, signal }) => {
      const unitYaml = serializeUnitYaml(unit);
      const configHash = hashUnitPublishPayload(unitYaml, credentials);

      logger.debug(`Publishing Streams unit [${unitId}] to config distributor`);

      const response = await request({
        path: `/v1/units/${encodeURIComponent(unitId)}`,
        method: 'PUT',
        body: JSON.stringify({
          unit_yaml: unitYaml,
          config_hash: configHash,
          ...credentialsField(credentials),
        }),
        signal,
      });

      if (!response.ok) {
        throw statusErrorFromDistributorResponse(
          `Failed to publish Streams unit [${unitId}] to config distributor`,
          response
        );
      }
    },
    validate: async ({ unit, credentials, signal }) => {
      const unitYaml = serializeUnitYaml(unit);

      logger.debug('Validating Streams unit with config distributor');

      // The distributor compiles references during validate too, so it needs the same blobs.
      const body = JSON.stringify({ unit_yaml: unitYaml, ...credentialsField(credentials) });
      let response = await request({ path: VALIDATE_PATH, method: 'POST', body, signal });
      // An older distributor answers 405 here, because the path matches its `PUT /v1/units/{unitId}`.
      if (response.status === 405) {
        response = await request({ path: LEGACY_VALIDATE_PATH, method: 'POST', body, signal });
      }

      const parsed = parseValidateResponse(response.text);

      if (parsed?.valid) {
        return compiledConfigResult(parsed.compiled_config);
      }

      if (parsed) {
        throw unitValidationError(parsed.diagnostics);
      }

      throw statusErrorFromDistributorResponse('Failed to validate Streams unit', response);
    },
    resolveTargetId,
  };
};

const credentialsField = (credentials: UnitCredential[]): { credentials?: UnitCredential[] } =>
  credentials.length > 0 ? { credentials } : {};

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
    !ssl.certificateAuthorities &&
    /unable to verify the first certificate|unable to get (local )?issuer certificate/i.test(detail)
      ? ' Set xpack.streams.distributor.ssl.certificateAuthorities to the distributor CA.'
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

const compiledConfigResult = (compiledConfig: string | undefined): UnitValidationResult => {
  if (typeof compiledConfig !== 'string' || compiledConfig.length === 0) {
    return {};
  }

  return { compiled_config: compiledConfig };
};

const parseValidateResponse = (
  text: string
): { valid: boolean; diagnostics: UnitDiagnostic[]; compiled_config?: string } | undefined => {
  try {
    const parsed: unknown = JSON.parse(text);

    if (!isRecord(parsed) || typeof parsed.valid !== 'boolean') {
      return undefined;
    }

    const diagnostics = parsed.diagnostics;
    const compiledConfig = parsed.compiled_config;

    return {
      valid: parsed.valid,
      diagnostics: Array.isArray(diagnostics)
        ? diagnostics.flatMap((diagnostic) => {
            const mapped = toUnitDiagnostic(diagnostic);
            return mapped ? [mapped] : [];
          })
        : [],
      ...(typeof compiledConfig === 'string' ? { compiled_config: compiledConfig } : {}),
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
