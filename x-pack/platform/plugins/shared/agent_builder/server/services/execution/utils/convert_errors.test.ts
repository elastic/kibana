/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, throwError } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  AgentBuilderErrorCode,
  createBadRequestError,
  createRequestAbortedError,
  isAgentBuilderError,
  isRequestAbortedError,
} from '@kbn/agent-builder-common';
import { convertErrors, toClientError } from './convert_errors';

jest.mock('../../../tracing', () => ({
  getCurrentTraceId: () => 'trace-1',
}));

describe('toClientError', () => {
  it('returns the same AgentBuilderError instance with the trace id stamped on meta', () => {
    const err = createBadRequestError('bad input', { foo: 'bar' });

    const converted = toClientError(err);

    expect(converted).toBe(err);
    expect(converted.meta).toEqual(expect.objectContaining({ foo: 'bar', traceId: 'trace-1' }));
  });

  it('keeps a RequestAbortedError recognisable', () => {
    expect(isRequestAbortedError(toClientError(createRequestAbortedError('stop')))).toBe(true);
  });

  it('wraps a plain error as an internal error with status 500 and the trace id', () => {
    const converted = toClientError(new Error('x'));

    expect(isAgentBuilderError(converted)).toBe(true);
    expect(converted.code).toBe(AgentBuilderErrorCode.internalError);
    expect(converted.message).toBe('Error executing agent: x');
    expect(converted.meta).toEqual(
      expect.objectContaining({ statusCode: 500, traceId: 'trace-1' })
    );
  });

  it('keeps the wrapped error as the cause so its message survives serialization', () => {
    const original = new Error('Error calling connector: 404');

    const converted = toClientError(original);

    expect((converted as Error & { cause?: unknown }).cause).toBe(original);
  });

  it('wraps a non-Error value', () => {
    expect(toClientError('boom').message).toBe('Error executing agent: boom');
  });

  it('is idempotent', () => {
    const once = toClientError(new Error('x'));
    const twice = toClientError(once);

    expect(twice).toBe(once);
    expect(twice.message).toBe('Error executing agent: x');
  });
});

describe('convertErrors', () => {
  it('reports the round error and rethrows the client error', async () => {
    const reportRoundError = jest.fn();
    const source$ = throwError(() => new Error('llm exploded'));

    await expect(
      lastValueFrom(
        source$.pipe(
          convertErrors({
            agentId: 'agent-1',
            logger: loggingSystemMock.createLogger(),
            analyticsService: { reportRoundError } as never,
            modelProvider: 'openai' as never,
            conversationId: 'conv-1',
            executionId: 'exec-1',
          })
        )
      )
    ).rejects.toMatchObject({
      code: AgentBuilderErrorCode.internalError,
      message: 'Error executing agent: llm exploded',
    });

    expect(reportRoundError).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'agent-1',
        conversationId: 'conv-1',
        executionId: 'exec-1',
      })
    );
  });
});
