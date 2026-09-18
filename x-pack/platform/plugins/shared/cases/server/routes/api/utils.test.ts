/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom, boomify } from '@hapi/boom';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { HTTPError } from '../../common/error';
import { createCaseError } from '../../common/error';
import { createTypedApiError } from '../../common/api_errors';
import { extractWarningValueFromWarningHeader, logDeprecatedEndpoint, wrapError } from './utils';

describe('Utils', () => {
  describe('wrapError', () => {
    it('wraps an error', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(isBoom(res.body as Error)).toBe(true);
    });

    it('it set statusCode to 500', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(res.statusCode).toBe(500);
    });

    it('it set statusCode to errors status code', () => {
      const error = new Error('Something happened') as HTTPError;
      error.statusCode = 404;
      const res = wrapError(error);

      expect(res.statusCode).toBe(404);
    });

    it('it accepts a boom error', () => {
      const error = boomify(new Error('Something happened'));
      const res = wrapError(error);

      // Utils returns the same boom error as body
      expect(res.body).toBe(error);
    });

    it('it accepts a boom error with status code', () => {
      const error = boomify(new Error('Something happened'), { statusCode: 404 });
      const res = wrapError(error);

      expect(res.statusCode).toBe(404);
    });

    it('it returns empty headers', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(res.headers).toEqual({});
    });

    it('serializes typed api error attributes into the response body', () => {
      const error = createTypedApiError({
        statusCode: 409,
        message: 'Cannot change the name of field definition "my_field".',
        attributes: { code: 'field_identity_immutable', changed: ['name'] },
      });

      const res = wrapError(error);

      expect(res.statusCode).toBe(409);
      expect(res.body).toEqual({
        message: 'Cannot change the name of field definition "my_field".',
        attributes: { code: 'field_identity_immutable', changed: ['name'] },
      });
    });

    it('preserves typed attributes when the error was re-wrapped by createCaseError', () => {
      // FAILURE SCENARIO: route handlers wrap thrown errors in CaseError before
      // wrapError runs — the machine-readable code must survive that hop too.
      const typed = createTypedApiError({
        statusCode: 409,
        message: 'identity is immutable',
        attributes: { code: 'field_identity_immutable', changed: ['name', 'type'] },
      });
      const wrapped = createCaseError({ message: `Failed to update: ${typed}`, error: typed });

      const res = wrapError(wrapped);

      expect(res.statusCode).toBe(409);
      expect(res.body).toEqual({
        message: 'identity is immutable',
        attributes: { code: 'field_identity_immutable', changed: ['name', 'type'] },
      });
    });

    it('does not attach attributes for a plain boom with unrelated data', () => {
      const error = boomify(new Error('Something happened'), { statusCode: 400 });
      error.data = { some: 'unrelated' };

      const res = wrapError(error);

      expect(res.body).toBe(error);
    });
  });

  describe('logDeprecatedEndpoint', () => {
    const logger = loggingSystemMock.createLogger();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does NOT log when the request is from the kibana client', () => {
      logDeprecatedEndpoint(logger, true, 'test');
      expect(logger.warn).not.toHaveBeenCalledWith('test');
    });

    it('does log when the request is NOT from the kibana client', () => {
      logDeprecatedEndpoint(logger, false, 'test');
      expect(logger.warn).toHaveBeenCalledWith('test');
    });
  });

  describe('extractWarningValueFromWarningHeader', () => {
    it('extracts the warning value from a warning header correctly', () => {
      expect(extractWarningValueFromWarningHeader(`299 Kibana-8.1.0 "Deprecation endpoint"`)).toBe(
        'Deprecation endpoint'
      );
    });
  });
});
