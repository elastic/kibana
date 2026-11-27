/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ExecutionError } from '@kbn/workflows/server';
import { getAuthorizedWriteRequest, throwStepExecutionError } from './event_step_helpers';

const fakeRequest = httpServerMock.createKibanaRequest();
const context = { contextManager: { getFakeRequest: () => fakeRequest } };

const catchError = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('getAuthorizedWriteRequest', () => {
  it('returns the step request when the privilege check passes', async () => {
    const check = jest.fn().mockResolvedValue(true);

    await expect(getAuthorizedWriteRequest(context, check, 'denied')).resolves.toBe(fakeRequest);
    expect(check).toHaveBeenCalledWith(fakeRequest);
  });

  it('throws a PermissionError with the given message when the check fails', async () => {
    const check = jest.fn().mockResolvedValue(false);

    const thrown = await getAuthorizedWriteRequest(context, check, 'denied').catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('PermissionError');
    expect(thrown.message).toBe('denied');
  });
});

describe('throwStepExecutionError', () => {
  const options = { abortSignal: new AbortController().signal, fallbackMessage: 'fallback' };

  it('rethrows an ExecutionError as it is', () => {
    const original = new ExecutionError({ type: 'PermissionError', message: 'no' });

    expect(catchError(() => throwStepExecutionError(original, options))).toBe(original);
  });

  it('rethrows the original error when the run was aborted', () => {
    const abortController = new AbortController();
    abortController.abort();
    const cause = new Error('Request aborted');

    const thrown = catchError(() =>
      throwStepExecutionError(cause, { ...options, abortSignal: abortController.signal })
    );

    expect(thrown).toBe(cause);
    expect(thrown).not.toBeInstanceOf(ExecutionError);
  });

  it('turns a ZodError into a ValidationError', () => {
    const zodError = Object.assign(new Error('bad input'), { name: 'ZodError' });

    const thrown = catchError(() => throwStepExecutionError(zodError, options));

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown).toMatchObject({ type: 'ValidationError', message: 'bad input' });
  });

  it('turns any other error into an ApiError with its message', () => {
    const thrown = catchError(() =>
      throwStepExecutionError(new Error('ES connection refused'), options)
    );

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown).toMatchObject({ type: 'ApiError', message: 'ES connection refused' });
  });

  it('uses the fallback message for a value that is not an Error', () => {
    const thrown = catchError(() => throwStepExecutionError('boom', options));

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown).toMatchObject({ type: 'ApiError', message: 'fallback' });
  });
});
