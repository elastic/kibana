/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { transformError } from './utils';

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
});
