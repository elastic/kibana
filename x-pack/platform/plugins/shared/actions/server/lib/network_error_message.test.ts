/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import {
  applyNetworkErrorMessage,
  getNetworkErrorMessage,
  isNetworkError,
} from './network_error_message';

const createSystemError = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

const createNetworkAxiosError = (code: string, message: string) =>
  new AxiosError(message, code, undefined, undefined, undefined);

const createAxiosErrorWithCause = (code: string, message: string) => {
  const cause = createSystemError(code, message);
  return Object.assign(new AxiosError(message, code), { cause });
};

const HOSTNAME = 'The hostname could not be resolved';
const NOT_ESTABLISHED = 'The connection could not be established';
const INTERRUPTED = 'The connection was interrupted before a response was received';
const TIMED_OUT = 'The request timed out waiting for a response';

describe('getNetworkErrorMessage', () => {
  it.each([
    ['ENOTFOUND', 'getaddrinfo ENOTFOUND example.invalid', HOSTNAME],
    ['EAI_AGAIN', 'getaddrinfo EAI_AGAIN example.invalid', HOSTNAME],
    ['ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:55555', NOT_ESTABLISHED],
    ['ETIMEDOUT', 'connect ETIMEDOUT 10.0.0.1:443', NOT_ESTABLISHED],
    ['EHOSTUNREACH', 'connect EHOSTUNREACH 10.0.0.1:443', NOT_ESTABLISHED],
    ['ENETUNREACH', 'connect ENETUNREACH 10.0.0.1:443', NOT_ESTABLISHED],
    ['ECONNRESET', 'read ECONNRESET', INTERRUPTED],
    ['EPIPE', 'write EPIPE', INTERRUPTED],
  ])('categorizes %s found on the cause', (code, message, description) => {
    expect(getNetworkErrorMessage(createAxiosErrorWithCause(code, message))).toBe(
      `${description} (${message})`
    );
  });

  it('categorizes a "socket hang up" error', () => {
    expect(getNetworkErrorMessage(createAxiosErrorWithCause('ECONNRESET', 'socket hang up'))).toBe(
      `${INTERRUPTED} (socket hang up)`
    );
  });

  it('categorizes a timeout reported on the axios error itself', () => {
    expect(
      getNetworkErrorMessage(createNetworkAxiosError('ECONNABORTED', 'timeout of 1000ms exceeded'))
    ).toBe(`${TIMED_OUT} (timeout of 1000ms exceeded)`);
  });

  it('reads the first error of an AggregateError cause', () => {
    const aggregate = new AggregateError(
      [
        createSystemError('ECONNREFUSED', 'connect ECONNREFUSED ::1:55555'),
        createSystemError('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:55555'),
      ],
      ''
    );
    const error = Object.assign(new AxiosError('', 'ECONNREFUSED'), { cause: aggregate });

    expect(getNetworkErrorMessage(error)).toBe(
      `${NOT_ESTABLISHED} (connect ECONNREFUSED ::1:55555)`
    );
  });

  it('returns only the description when the underlying error has no message', () => {
    expect(getNetworkErrorMessage(createAxiosErrorWithCause('ECONNRESET', ''))).toBe(INTERRUPTED);
  });

  it('returns undefined for an unknown error code', () => {
    expect(getNetworkErrorMessage(createAxiosErrorWithCause('ERR_BAD_REQUEST', 'nope'))).toBe(
      undefined
    );
  });

  it('returns undefined for an error without a code', () => {
    expect(getNetworkErrorMessage(new AxiosError('boom'))).toBe(undefined);
  });

  it('returns undefined when the server responded', () => {
    const error = new AxiosError('failed', 'ECONNRESET', undefined, undefined, {
      status: 500,
    } as AxiosResponse);

    expect(getNetworkErrorMessage(error)).toBe(undefined);
  });
});

describe('isNetworkError', () => {
  it('is true for a recognized network error', () => {
    expect(isNetworkError(createAxiosErrorWithCause('ECONNRESET', 'read ECONNRESET'))).toBe(true);
  });

  it('is false for an unknown code, a missing code, and a responded error', () => {
    expect(isNetworkError(createAxiosErrorWithCause('ERR_BAD_REQUEST', 'nope'))).toBe(false);
    expect(isNetworkError(new AxiosError('boom'))).toBe(false);
    expect(
      isNetworkError(
        new AxiosError('failed', 'ECONNRESET', undefined, undefined, {
          status: 500,
        } as AxiosResponse)
      )
    ).toBe(false);
  });
});

describe('applyNetworkErrorMessage', () => {
  it('replaces the message and keeps the code, cause and stack', () => {
    const error = createAxiosErrorWithCause('ECONNRESET', 'read ECONNRESET');
    const { cause, stack } = error;

    applyNetworkErrorMessage(error);

    expect(error.message).toBe(`${INTERRUPTED} (read ECONNRESET)`);
    expect(error.code).toBe('ECONNRESET');
    expect(error.cause).toBe(cause);
    expect(error.stack).toBe(stack);
  });

  it('leaves the message of other errors untouched', () => {
    const error = new AxiosError('failed', 'ERR_BAD_REQUEST');

    applyNetworkErrorMessage(error);

    expect(error.message).toBe('failed');
  });
});
