/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import {
  transformError,
  transformBulkError,
  BulkError,
  createSuccessObject,
  getIndex,
  ImportSuccessError,
  createImportErrorObject,
  transformImportError,
} from './utils';

describe('utils', () => {
  describe('transformError', () => {
    test('returns transformed output error from boom object with a 500 and payload of internal server error', () => {
      const boom = new Boom('some boom message');
      const transformed = transformError(boom);
      expect(transformed).toEqual({
        message: 'An internal server error occurred',
        statusCode: 500,
      });
    });

    test('returns transformed output if it is some non boom object that has a statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'some message',
        statusCode: 403,
      });
    });

    test('returns a transformed message with the message set and statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'some message',
        statusCode: 403,
      });
    });

    test('transforms best it can if it is some non boom object but it does not have a status Code.', () => {
      const error: Error = {
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'some message',
        statusCode: 500,
      });
    });

    test('it detects a TypeError and returns a status code of 400 from that particular error type', () => {
      const error: TypeError = new TypeError('I have a type error');
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'I have a type error',
        statusCode: 400,
      });
    });

    test('it detects a TypeError and returns a Boom status of 400', () => {
      const error: TypeError = new TypeError('I have a type error');
      const transformed = transformError(error);
      expect(transformed).toEqual({
        message: 'I have a type error',
        statusCode: 400,
      });
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

  describe('createSuccessObject', () => {
    test('it should increment the existing success object by 1', () => {
      const success = createSuccessObject({
        success_count: 0,
        success: true,
        errors: [],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: true,
        errors: [],
      };
      expect(success).toEqual(expected);
    });

    test('it should increment the existing success object by 1 and not touch the boolean or errors', () => {
      const success = createSuccessObject({
        success_count: 0,
        success: false,
        errors: [
          { rule_id: 'rule-1', error: { status_code: 500, message: 'some sad sad sad error' } },
        ],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'rule-1', error: { status_code: 500, message: 'some sad sad sad error' } },
        ],
      };
      expect(success).toEqual(expected);
    });
  });

  describe('createImportErrorObject', () => {
    test('it creates an error message and does not increment the success count', () => {
      const error = createImportErrorObject({
        ruleId: 'some-rule-id',
        statusCode: 400,
        message: 'some-message',
        existingImportSuccessError: {
          success_count: 1,
          success: true,
          errors: [],
        },
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      };
      expect(error).toEqual(expected);
    });

    test('appends a second error message and does not increment the success count', () => {
      const error = createImportErrorObject({
        ruleId: 'some-rule-id',
        statusCode: 400,
        message: 'some-message',
        existingImportSuccessError: {
          success_count: 1,
          success: false,
          errors: [
            { rule_id: 'rule-1', error: { status_code: 500, message: 'some sad sad sad error' } },
          ],
        },
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'rule-1', error: { status_code: 500, message: 'some sad sad sad error' } },
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
        ],
      };
      expect(error).toEqual(expected);
    });
  });

  describe('transformImportError', () => {
    test('returns transformed object if it is a boom object', () => {
      const boom = new Boom('some boom message', { statusCode: 400 });
      const transformed = transformImportError('rule-1', boom, {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
          { rule_id: 'rule-1', error: { status_code: 400, message: 'some boom message' } },
        ],
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a normal error if it is some non boom object that has a statusCode', () => {
      const error: Error & { statusCode?: number } = {
        statusCode: 403,
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformImportError('rule-1', error, {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
          { rule_id: 'rule-1', error: { status_code: 403, message: 'some message' } },
        ],
      };
      expect(transformed).toEqual(expected);
    });

    test('returns a 500 if the status code is not set', () => {
      const error: Error & { statusCode?: number } = {
        name: 'some name',
        message: 'some message',
      };
      const transformed = transformImportError('rule-1', error, {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
          { rule_id: 'rule-1', error: { status_code: 500, message: 'some message' } },
        ],
      };
      expect(transformed).toEqual(expected);
    });

    test('it detects a TypeError and returns a Boom status of 400', () => {
      const error: TypeError = new TypeError('I have a type error');
      const transformed = transformImportError('rule-1', error, {
        success_count: 1,
        success: false,
        errors: [{ rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } }],
      });
      const expected: ImportSuccessError = {
        success_count: 1,
        success: false,
        errors: [
          { rule_id: 'some-rule-id', error: { status_code: 400, message: 'some-message' } },
          { rule_id: 'rule-1', error: { status_code: 400, message: 'I have a type error' } },
        ],
      };
      expect(transformed).toEqual(expected);
    });
  });

  describe('getIndex', () => {
    it('appends the space ID to the configured index if spaces are enabled', () => {
      const mockGet = jest.fn();
      const mockGetSpaceId = jest.fn();
      const config = jest.fn(() => ({ get: mockGet, has: jest.fn() }));
      const server = { plugins: { spaces: { getSpaceId: mockGetSpaceId } }, config };

      mockGet.mockReturnValue('mockSignalsIndex');
      mockGetSpaceId.mockReturnValue('myspace');
      // @ts-ignore-next-line TODO these dependencies are simplified on
      // https://github.com/elastic/kibana/pull/56814. We're currently mocking
      // out what we need.
      const index = getIndex(null, server);

      expect(index).toEqual('mockSignalsIndex-myspace');
    });

    it('appends the default space ID to the configured index if spaces are disabled', () => {
      const mockGet = jest.fn();
      const config = jest.fn(() => ({ get: mockGet, has: jest.fn() }));
      const server = { plugins: {}, config };

      mockGet.mockReturnValue('mockSignalsIndex');
      // @ts-ignore-next-line TODO these dependencies are simplified on
      // https://github.com/elastic/kibana/pull/56814. We're currently mocking
      // out what we need.
      const index = getIndex(null, server);

      expect(index).toEqual('mockSignalsIndex-default');
    });
  });
});
