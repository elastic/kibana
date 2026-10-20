/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { ServerSentEventError } from '@kbn/sse-utils';
import { SavedObjectsErrorHelpers as SO } from '@kbn/core-saved-objects-server';
import type { CodecInput, WireValue } from './codecs';

const soCodecs = [
  { id: 'badRequest', check: SO.isBadRequestError, restore: SO.decorateBadRequestError },
  {
    id: 'invalidVersion',
    check: SO.isInvalidVersionError,
    restore: () => SO.createInvalidVersionError(),
  },
  { id: 'notAuthorized', check: SO.isNotAuthorizedError, restore: SO.decorateNotAuthorizedError },
  { id: 'forbidden', check: SO.isForbiddenError, restore: SO.decorateForbiddenError },
  {
    id: 'tooLarge',
    check: SO.isRequestEntityTooLargeError,
    restore: SO.decorateRequestEntityTooLargeError,
  },
  { id: 'notFound', check: SO.isNotFoundError, restore: () => SO.createGenericNotFoundError() },
  { id: 'conflict', check: SO.isConflictError, restore: SO.decorateConflictError },
  {
    id: 'tooManyRequests',
    check: SO.isTooManyRequestsError,
    restore: SO.decorateTooManyRequestsError,
  },
  {
    id: 'script',
    check: SO.isEsCannotExecuteScriptError,
    restore: SO.decorateEsCannotExecuteScriptError,
  },
  { id: 'unavailable', check: SO.isEsUnavailableError, restore: SO.decorateEsUnavailableError },
  { id: 'general', check: SO.isGeneralError, restore: SO.decorateGeneralError },
] as const;

/** ES client error classes rebuilt by the receiving isolate's own @elastic/elasticsearch copy. */
const esCodecs = {
  ResponseError: EsErrors.ResponseError,
  TimeoutError: EsErrors.TimeoutError,
  ConnectionError: EsErrors.ConnectionError,
  NoLivingConnectionsError: EsErrors.NoLivingConnectionsError,
  RequestAbortedError: EsErrors.RequestAbortedError,
} as const;
type EsCodecId = keyof typeof esCodecs;
const esCodecId = (error: Error): EsCodecId | undefined =>
  (Object.keys(esCodecs) as EsCodecId[]).find(
    // Most specific first is not needed: these classes are siblings, not subclasses.
    (id) => error instanceof esCodecs[id]
  );
const SAFE_RESPONSE_HEADERS = new Set([
  'content-type',
  'retry-after',
  'warning',
  'x-opaque-id',
  'trace-id',
]);
const SAFE_RESPONSE_HEADER_PREFIXES = ['x-elastic-', 'x-found-'] as const;
const safeResponseHeader = (key: string): boolean =>
  SAFE_RESPONSE_HEADERS.has(key) ||
  SAFE_RESPONSE_HEADER_PREFIXES.some((prefix) => key.startsWith(prefix));
/**
 * Keeps the DiagnosticResult fields retry/classification guards read (body, statusCode,
 * allowlisted response headers, warnings, attempts, aborted, request method/path/id).
 * Request headers/body/querystring, connection URL and context are dropped (credentials).
 */
const esDiagnostic = (
  meta: unknown,
  field: (value: CodecInput) => WireValue
): Record<string, CodecInput> => {
  const source = (meta && typeof meta === 'object' ? meta : {}) as {
    body?: unknown;
    statusCode?: unknown;
    headers?: Record<string, unknown>;
    warnings?: unknown;
    meta?: {
      name?: unknown;
      attempts?: unknown;
      aborted?: unknown;
      request?: { id?: unknown; params?: { method?: unknown; path?: unknown } };
    };
  };
  let body: CodecInput | undefined;
  if (source.body !== undefined) {
    try {
      field(source.body as CodecInput);
      body = source.body as CodecInput;
    } catch {
      body = undefined; // streams/buffers in asStream mode: omit rather than fail the error.
    }
  }
  const headers: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(source.headers ?? {}))
    if (
      safeResponseHeader(key.toLowerCase()) &&
      (typeof value === 'string' ||
        (Array.isArray(value) && value.every((item) => typeof item === 'string')))
    )
      headers[key] = value as string | string[];
  const inner = source.meta;
  const request = inner?.request;
  return {
    ...(body === undefined ? {} : { body }),
    ...(typeof source.statusCode === 'number' ? { statusCode: source.statusCode } : {}),
    headers,
    warnings: Array.isArray(source.warnings)
      ? source.warnings.filter((item): item is string => typeof item === 'string')
      : null,
    meta: {
      name: typeof inner?.name === 'string' ? inner.name : 'elasticsearch-js',
      attempts: typeof inner?.attempts === 'number' ? inner.attempts : 0,
      aborted: inner?.aborted === true,
      request: {
        id: typeof request?.id === 'string' || typeof request?.id === 'number' ? request.id : null,
        method: typeof request?.params?.method === 'string' ? request.params.method : null,
        path: typeof request?.params?.path === 'string' ? request.params.path : null,
      },
    },
  };
};
const rebuildEsDiagnostic = (fields: Record<string, CodecInput> | undefined) => {
  if (!fields) throw new Error('Invalid ES error diagnostic');
  const meta = fields.meta as {
    name: string;
    attempts: number;
    aborted: boolean;
    request: { id: string | number | null; method: string | null; path: string | null };
  };
  return {
    ...(fields.body === undefined ? {} : { body: fields.body }),
    ...(typeof fields.statusCode === 'number' ? { statusCode: fields.statusCode } : {}),
    headers: fields.headers as Record<string, string | string[]>,
    warnings: fields.warnings as string[] | null,
    meta: {
      context: null,
      name: meta.name,
      request: {
        params: { method: meta.request.method ?? 'GET', path: meta.request.path ?? '' },
        options: {},
        id: meta.request.id,
      },
      connection: null,
      attempts: meta.attempts,
      aborted: meta.aborted,
    },
  };
};

export interface EncodedError {
  readonly kind: 'error';
  readonly codec: string;
  readonly name: string;
  readonly message: string;
  readonly fields: WireValue;
  readonly cause?: WireValue;
  readonly stack?: string;
}

/** Uses real owner factories so Error guards and private SO symbols survive transport. */
export const encodeError = (
  error: Error,
  field: (value: CodecInput) => WireValue
): EncodedError => {
  let codec = 'error';
  let fields: object = {};
  const es = esCodecId(error);
  if (error instanceof ServerSentEventError) {
    codec = 'sse';
    fields = { code: error.code, meta: error.meta };
  } else if (es) {
    codec = 'es:' + es;
    fields = { diagnostic: esDiagnostic((error as { meta?: unknown }).meta, field) };
  } else if (Boom.isBoom(error)) {
    const so = soCodecs.find((entry) => entry.check(error));
    codec = so ? 'so:' + so.id : 'boom';
    fields = { output: error.output, data: error.data, isServer: error.isServer };
  } else {
    fields = {
      ...('code' in error && typeof error.code === 'string' ? { code: error.code } : {}),
      ...('statusCode' in error && typeof error.statusCode === 'number'
        ? { statusCode: error.statusCode }
        : {}),
    };
  }
  return {
    kind: 'error',
    codec,
    name: error.name,
    message: error.message,
    fields: field(fields),
    ...('cause' in error ? { cause: field(error.cause as CodecInput) } : {}),
    ...(error.stack ? { stack: error.stack } : {}),
  };
};

/** Rebuilds only known owner error types; unknown codec versions fail closed. */
export const decodeError = (wire: EncodedError, field: (value: WireValue) => CodecInput): Error => {
  const fields = field(wire.fields) as {
    code?: string;
    meta?: Record<string, CodecInput>;
    data?: object;
    output?: Boom.Boom['output'];
    isServer?: boolean;
    statusCode?: number;
    diagnostic?: Record<string, CodecInput>;
  };
  let error: Error;
  if (wire.codec === 'sse') {
    if (typeof fields.code !== 'string') throw new Error('Invalid SSE error code');
    error = new ServerSentEventError(fields.code, wire.message, fields.meta);
  } else if (wire.codec === 'boom' || wire.codec.startsWith('so:')) {
    const so = soCodecs.find((entry) => 'so:' + entry.id === wire.codec);
    if (wire.codec !== 'boom' && !so) throw new Error('Unknown SO error codec');
    const boom = so
      ? so.restore(new Error(wire.message))
      : Boom.boomify(new Error(wire.message), { statusCode: fields.output?.statusCode ?? 500 });
    if (!Boom.isBoom(boom) || !fields.output) throw new Error('Invalid Boom error fields');
    boom.output = fields.output;
    boom.data = fields.data;
    error = boom;
  } else if (wire.codec.startsWith('es:')) {
    const id = wire.codec.slice(3) as EsCodecId;
    if (!Object.prototype.hasOwnProperty.call(esCodecs, id))
      throw new Error('Unknown ES error codec');
    // Typed loosely: DiagnosticResult requires a Connection, which never crosses (credentials).
    const diagnostic = rebuildEsDiagnostic(fields.diagnostic) as never;
    error =
      id === 'ResponseError'
        ? new EsErrors.ResponseError(diagnostic)
        : id === 'NoLivingConnectionsError'
        ? new EsErrors.NoLivingConnectionsError(wire.message, diagnostic)
        : new esCodecs[id](wire.message, diagnostic);
  } else if (wire.codec === 'error') {
    error = new Error(wire.message);
    if (fields.code !== undefined) Object.assign(error, { code: fields.code });
    if (fields.statusCode !== undefined) Object.assign(error, { statusCode: fields.statusCode });
  } else {
    throw new Error('Unknown typed error codec');
  }
  error.name = wire.name;
  error.message = wire.message;
  if (wire.stack) error.stack = wire.stack;
  if (wire.cause) Object.assign(error, { cause: field(wire.cause) });
  return error;
};
