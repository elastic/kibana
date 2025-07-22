/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom, boomify } from '@hapi/boom';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { PAGE_ATTACHMENT_TYPE } from '@kbn/page-attachment-schema';
import type { HTTPError } from '../../common/error';
import {
  extractWarningValueFromWarningHeader,
  logDeprecatedEndpoint,
  wrapError,
  validAttachment,
  isPersistableStatePageAttachment,
} from './utils';

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
  });

  describe('logDeprecatedEndpoint', () => {
    const logger = loggingSystemMock.createLogger();
    const kibanaHeader = { 'kbn-version': '8.1.0', referer: 'test' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does NOT log when the request is from the kibana client', () => {
      logDeprecatedEndpoint(logger, kibanaHeader, 'test');
      expect(logger.warn).not.toHaveBeenCalledWith('test');
    });

    it('does log when the request is NOT from the kibana client', () => {
      logDeprecatedEndpoint(logger, {}, 'test');
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

  describe('validAttachment', () => {
    it('validates a valid attachment', () => {
      const attachment = {
        persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
        persistableStateAttachmentState: {
          url: { pathAndQuery: '/internal/safe-url' },
        },
      };

      expect(validAttachment.validate(attachment)).toEqual(attachment);
    });

    it('throws an error for an external URL', () => {
      const invalidAttachment = {
        persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
        persistableStateAttachmentState: {
          url: { pathAndQuery: 'http://external-url.com' },
        },
      };

      expect(() => validAttachment.validate(invalidAttachment)).toThrow(
        'External urls are not supported for page attachments. The provided url is: http://external-url.com'
      );
    });
  });

  describe('isPersistableStatePageAttachment', () => {
    it('returns true for a valid persistable state page attachment', () => {
      const attachment = {
        persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
        persistableStateAttachmentState: {},
      };

      expect(isPersistableStatePageAttachment(attachment)).toBe(true);
    });

    it('returns false for an invalid attachment', () => {
      const invalidAttachment = {
        someOtherProperty: 'value',
      };

      expect(isPersistableStatePageAttachment(invalidAttachment)).toBe(false);
    });

    it('returns false for a null value', () => {
      expect(isPersistableStatePageAttachment(null)).toBe(false);
    });

    it('returns false for a non-object value', () => {
      expect(isPersistableStatePageAttachment('string')).toBe(false);
    });
  });
});
