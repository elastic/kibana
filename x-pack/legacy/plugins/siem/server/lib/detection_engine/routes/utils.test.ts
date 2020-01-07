/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { transformError, transformBulkError, BulkError } from './utils';

describe('utils', () => {
  describe('transformError', () => {
    test('returns boom if it is a boom object', () => {
      const boom = new Boom('');
      const transformed = transformError(boom);
      expect(transformed).toBe(boom);
    });

    test('returns a boom if it is some non boom object that has a statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(Boom.isBoom(transformed)).toBe(true);
    });

    test('returns a boom with the message set', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(transformed.message).toBe('some message');
    });

    test('does not return a boom if it is some non boom object but it does not have a status Code.', () => {
      const error: Error = {
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(Boom.isBoom(transformed)).toBe(false);
    });

    test('it detects a TypeError and returns a Boom', () => {
      const error: TypeError = new TypeError('I have a type error');
      const transformed = transformError(error);
      expect(Boom.isBoom(transformed)).toBe(true);
    });

    test('it detects a TypeError and returns a Boom status of 400', () => {
      const error: TypeError = new TypeError('I have a type error');
      const transformed = transformError(error) as Boom;
      expect(transformed.output.statusCode).toBe(400);
    });
  });

  describe('transformBulkError', () => {
    test('returns transformed object if it is a boom object', () => {
      const boom = new Boom('some boom message', { statusCode: 400 });
      const transformed = transformBulkError('rule-1', boom);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'some boom message', status_code: 400 },
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a normal error if it is some non boom object that has a statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformBulkError('rule-1', error);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'some message', status_code: 403 },
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a 500 if the status code is not set', () => {
      const error: Error & { statusCode?: number } = {
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformBulkError('rule-1', error);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'some message', status_code: 500 },
      };
      expect(transformed).toEqual(expected);
    });

    test('it detects a TypeError and returns a Boom status of 400', () => {
      const error: TypeError = new TypeError('I have a type error');
      const transformed = transformBulkError('rule-1', error);
      const expected: BulkError = {
        rule_id: 'rule-1',
        error: { message: 'I have a type error', status_code: 400 },
      };
      expect(transformed).toEqual(expected);
    });
  });
});
