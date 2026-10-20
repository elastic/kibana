/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
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
  if (error instanceof ServerSentEventError) {
    codec = 'sse';
    fields = { code: error.code, meta: error.meta };
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
