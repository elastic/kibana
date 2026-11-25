/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  AgentBuilderErrorCode,
  createBadRequestError,
  deserializeExecutionError,
} from '@kbn/agent-builder-common';
import {
  MAX_SERIALIZED_CAUSES,
  MAX_SERIALIZED_CAUSE_MESSAGE_LENGTH,
  serializeExecutionError,
} from './serialize_execution_error';

describe('serializeExecutionError', () => {
  it('passes through AgentBuilderError code, message, and meta', () => {
    const err = createBadRequestError('bad input', { foo: 'bar' });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.badRequest,
      message: 'bad input',
      meta: expect.objectContaining({ statusCode: 400, foo: 'bar' }),
    });
  });

  it('preserves the HTTP status from a Boom error in meta.statusCode', () => {
    const err = Boom.forbidden('Unauthorized to get actions');

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'Unauthorized to get actions',
      meta: { statusCode: 403 },
    });
  });

  it('preserves the HTTP status from a plain error carrying statusCode', () => {
    const err = Object.assign(new Error('nope'), { statusCode: 401 });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'nope',
      meta: { statusCode: 401 },
    });
  });

  it('omits meta for plain errors with no status', () => {
    expect(serializeExecutionError(new Error('boom'))).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'boom',
    });
  });

  it('ignores out-of-range status codes', () => {
    const err = Object.assign(new Error('weird'), { statusCode: 200 });

    expect(serializeExecutionError(err)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'weird',
    });
  });

  it('serializes the cause chain, outermost first, with names and codes', () => {
    const root = Object.assign(new Error('ECONNREFUSED 127.0.0.1:9200'), { code: 'ECONNREFUSED' });
    const middle = new Error('Error calling connector', { cause: root });
    const wrapper = new Error('Error executing agent', { cause: middle });

    expect(serializeExecutionError(wrapper)).toEqual({
      code: AgentBuilderErrorCode.internalError,
      message: 'Error executing agent',
      causes: [
        { name: 'Error', message: 'Error calling connector' },
        { name: 'Error', message: 'ECONNREFUSED 127.0.0.1:9200', code: 'ECONNREFUSED' },
      ],
    });
  });

  it('keeps causes on an AgentBuilderError too', () => {
    const err = createBadRequestError('bad input');
    (err as Error & { cause?: unknown }).cause = new Error('field x is required');

    expect(serializeExecutionError(err).causes).toEqual([
      { name: 'Error', message: 'field x is required' },
    ]);
  });

  it('bounds the chain depth and each message, and survives cycles and non-Error causes', () => {
    const chain = new Error('c0');
    let current: Error = chain;
    for (let i = 1; i < 10; i++) {
      const next = new Error(`c${i}`);
      (current as Error & { cause?: unknown }).cause = next;
      current = next;
    }
    expect(serializeExecutionError(chain).causes).toHaveLength(MAX_SERIALIZED_CAUSES);

    const long = new Error('x', { cause: new Error('y'.repeat(5_000)) });
    expect(serializeExecutionError(long).causes![0].message).toHaveLength(
      MAX_SERIALIZED_CAUSE_MESSAGE_LENGTH + 1
    );

    const loop = new Error('loop');
    (loop as Error & { cause?: unknown }).cause = loop;
    expect(serializeExecutionError(loop)).not.toHaveProperty('causes');

    expect(serializeExecutionError(new Error('x', { cause: 'plain string' })).causes).toEqual([
      { message: 'plain string' },
    ]);
  });

  it('omits causes when there are none', () => {
    expect(serializeExecutionError(new Error('boom'))).not.toHaveProperty('causes');
  });

  describe('deserializeExecutionError', () => {
    it('round-trips code, message, meta and the cause chain', () => {
      const serialized = {
        code: AgentBuilderErrorCode.internalError,
        message: 'Error executing agent',
        meta: { statusCode: 500, traceId: 't1' },
        causes: [
          { name: 'Error', message: 'Error calling connector' },
          { name: 'Error', message: 'ECONNREFUSED', code: 'ECONNREFUSED' },
        ],
      };

      const error = deserializeExecutionError(serialized);

      expect(error.code).toBe(AgentBuilderErrorCode.internalError);
      expect(error.message).toBe('Error executing agent');
      expect(error.meta).toEqual({ statusCode: 500, traceId: 't1' });
      expect(serializeExecutionError(error)).toEqual(serialized);
    });

    it('works without causes', () => {
      const serialized = { code: AgentBuilderErrorCode.badRequest, message: 'bad', meta: {} };
      expect(serializeExecutionError(deserializeExecutionError(serialized))).toEqual(serialized);
    });
  });
});
