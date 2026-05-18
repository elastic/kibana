/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHttpErrorToastMessage, toHttpError } from './http_error';

class FakeHttpFetchError extends Error {
  public request: unknown = {};
  public response?: { status?: number };
  public body?: unknown;

  constructor(message: string, options?: { status?: number; body?: unknown }) {
    super(message);
    this.name = 'HttpFetchError';
    this.response = options?.status ? { status: options.status } : undefined;
    this.body = options?.body;
  }
}

describe('http_error', () => {
  describe('toHttpError', () => {
    test('normalizes HttpFetchError with EsUiError body', () => {
      const error = new FakeHttpFetchError('boom', {
        status: 400,
        body: { error: 'Bad Request', message: 'Nope', statusCode: 400 },
      });

      expect(toHttpError(error)).toEqual({
        status: 400,
        body: { error: 'Bad Request', message: 'Nope', statusCode: 400 },
      });
    });

    test('normalizes HttpFetchError with non-EsUiError body', () => {
      const error = new FakeHttpFetchError('boom', { status: 500, body: 'not-an-object' });

      expect(toHttpError(error)).toEqual({
        status: 500,
        body: { error: 'Error', message: 'boom', statusCode: 500 },
      });
    });

    test('normalizes objects with EsUiError body and derives status from body.statusCode', () => {
      const error = { body: { error: 'Error', message: 'No privileges', statusCode: 403 } };

      expect(toHttpError(error)).toEqual({
        status: 403,
        body: { error: 'Error', message: 'No privileges', statusCode: 403 },
      });
    });

    test('normalizes native Error values', () => {
      const error = new Error('Something went wrong');
      expect(toHttpError(error)).toEqual({
        body: { error: 'Error', message: 'Something went wrong' },
      });
    });

    test('normalizes non-error values', () => {
      expect(toHttpError('nope')).toEqual({
        body: { error: 'Error', message: 'nope' },
      });
    });
  });

  describe('getHttpErrorToastMessage', () => {
    test('prefers body.message when available', () => {
      const error = { body: { error: 'Error', message: 'Readable', statusCode: 500 } };
      expect(getHttpErrorToastMessage(error)).toBe('Readable');
    });

    test('falls back to body.error when message is missing', () => {
      const error = { body: { error: 'Oops' } };
      expect(getHttpErrorToastMessage(error)).toBe('Oops');
    });

    test('stringifies unknown values', () => {
      expect(getHttpErrorToastMessage(123)).toBe('123');
    });
  });
});
