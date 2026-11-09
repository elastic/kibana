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
import type {
  ComponentCatalogue,
  ComponentValidationResult,
  StreamsUnit,
} from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import { combineAbortSignals } from './combine_abort_signals';
import { createTargetIdResolver, type ResolveTargetId } from './distributor_target_id';
import type {
  FetchComponentCatalogue,
  UnitConfigHooks,
  UnitCredential,
  UnitValidationResult,
  ValidateComponent,
} from './types';

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
  /** `GET /v1/components`, revalidated with the ETag of the copy the caller holds. */
  fetchComponentCatalogue: FetchComponentCatalogue;
  /** `POST /v1/components/validate` for one component, before any unit holds it. */
  validateComponent: ValidateComponent;
};

type UnitDiagnostic = StreamsUnit.Diagnostic;

const REQUEST_TIMEOUT_MS = 30_000;

const VALIDATE_PATH = '/v1/units/validate';
// Distributors before streams-config-distributor#441 serve validate here. Drop once every target runs #441.
const LEGACY_VALIDATE_PATH = '/v1/validate';
const COMPONENTS_PATH = '/v1/components';
const COMPONENTS_VALIDATE_PATH = '/v1/components/validate';

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

interface DistributorResponseHeaders {
  get: (name: string) => string | null;
}

type DistributorFetch = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  headers?: DistributorResponseHeaders;
  text: () => Promise<string>;
}>;

interface DistributorResponse {
  ok: boolean;
  status: number;
  text: string;
  header: (name: string) => string | undefined;
}

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
            ...(init.body !== undefined
              ? { 'content-length': String(Buffer.byteLength(init.body)) }
              : {}),
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
              headers: {
                get: (name) => {
                  const value = res.headers[name.toLowerCase()];
                  return Array.isArray(value) ? value.join(', ') : value ?? null;
                },
              },
              text: async () => text,
            });
          });
        }
      );

      req.on('error', reject);
      if (init.body !== undefined) {
        req.write(init.body);
      }
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
    const distributorNotConfigured = (operation: string): never => {
      const message = `streams-config-distributor URL is not configured; skipping ${operation}.`;
      logger.debug(message);
      throw new StatusError(message, 503);
    };

    return {
      publish: async (): Promise<void> => distributorNotConfigured('unit publish'),
      validate: async (): Promise<UnitValidationResult> =>
        distributorNotConfigured('unit validation'),
      resolveTargetId: () => distributorNotConfigured('target id resolution'),
      fetchComponentCatalogue: async () => distributorNotConfigured('the component catalogue'),
      validateComponent: async (): Promise<ComponentValidationResult> =>
        distributorNotConfigured('component validation'),
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
    headers = {},
    signal,
  }: {
    path: string;
    method: string;
    body?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<DistributorResponse> => {
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
    const requestSignal = combineAbortSignals([timeoutController.signal, signal]);

    try {
      const response = await requestWithTls(`${baseUrl}${path}`, {
        method,
        headers: body !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
        body,
        signal: requestSignal.signal,
      });

      return {
        ok: response.ok,
        status: response.status,
        text: await response.text(),
        header: (name) => response.headers?.get(name) ?? undefined,
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

      const parsed = parseValidationVerdict(response.text);

      if (parsed?.valid) {
        return compiledConfigResult(parsed.compiled_config);
      }

      if (parsed) {
        throw unitValidationError(parsed.diagnostics);
      }

      throw statusErrorFromDistributorResponse('Failed to validate Streams unit', response);
    },
    resolveTargetId,
    fetchComponentCatalogue: async ({ etag, signal }) => {
      logger.debug('Fetching the Streams component catalogue from config distributor');

      const response = await request({
        path: COMPONENTS_PATH,
        method: 'GET',
        headers: etag ? { 'if-none-match': etag } : {},
        signal,
      });

      if (response.status === 304) {
        return { notModified: true };
      }

      if (!response.ok) {
        throw statusErrorFromDistributorResponse(
          'Failed to fetch the Streams component catalogue',
          response
        );
      }

      const catalogue = parseComponentCatalogue(response.text);
      if (!catalogue) {
        throw new StatusError(
          'streams-config-distributor returned a component catalogue Kibana cannot read.',
          502
        );
      }

      return { notModified: false, catalogue, etag: response.header('etag') };
    },
    validateComponent: async ({ kind, component, signal }) => {
      logger.debug(`Validating Streams ${kind} [${component.id}] with config distributor`);

      const response = await request({
        path: COMPONENTS_VALIDATE_PATH,
        method: 'POST',
        body: JSON.stringify({ kind, configuration: YAML.stringify(component) }),
        signal,
      });

      // An invalid component is a 400 that still carries the verdict.
      const parsed = parseValidationVerdict(response.text);
      if (parsed && (response.ok || response.status === 400)) {
        return { valid: parsed.valid, diagnostics: parsed.diagnostics };
      }

      // Distributors before streams-config-distributor#429 have no such route. That is version
      // skew on the backend, not a request the caller could fix.
      if (response.status === 404) {
        throw new StatusError(
          'streams-config-distributor does not support component validation (streams-config-distributor#429).',
          502
        );
      }

      throw statusErrorFromDistributorResponse('Failed to validate Streams component', response);
    },
  };
};

const credentialsField = (credentials: UnitCredential[]): { credentials?: UnitCredential[] } =>
  credentials.length > 0 ? { credentials } : {};

// The distributor answers 401/403 when it rejects Kibana's client certificate. Passed through, a 401
// logs the browser session out and a 403 reads as missing Kibana privileges, so both become 502.
const DISTRIBUTOR_CERTIFICATE_STATUSES: ReadonlySet<number> = new Set([401, 403]);

const statusErrorFromDistributorResponse = (
  prefix: string,
  response: { status: number; text: string }
): StatusError => {
  const { status, text } = response;
  const isClientError =
    status >= 400 && status < 500 && !DISTRIBUTOR_CERTIFICATE_STATUSES.has(status);
  return new StatusError(`${prefix}: ${status} ${text}`, isClientError ? status : 502);
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

/**
 * The `{ valid, diagnostics }` verdict that both validate routes answer with. Only the unit
 * route adds `compiled_config`; the component route never does.
 */
const parseValidationVerdict = (
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

// Only the envelope is checked. The streams-api-driven-components schema owns the content, and the
// UI renders field types it does not know with a fallback control.
const isComponentCatalogue = (value: unknown): value is ComponentCatalogue =>
  isRecord(value) &&
  typeof value.schema_version === 'string' &&
  typeof value.component_revision === 'string' &&
  Array.isArray(value.components) &&
  isRecord(value.metadata) &&
  Array.isArray(value.definitions);

const parseComponentCatalogue = (text: string): ComponentCatalogue | undefined => {
  try {
    const parsed: unknown = JSON.parse(text);
    return isComponentCatalogue(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

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
