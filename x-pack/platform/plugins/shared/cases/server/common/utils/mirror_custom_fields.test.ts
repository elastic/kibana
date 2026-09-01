/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { isBoom } from '@hapi/boom';
import { getTypedApiErrorAttributes } from '../api_errors';
import { logUnresolvedMirrorKeys, throwIfMalformedFieldLinkage } from './mirror_custom_fields';

describe('throwIfMalformedFieldLinkage', () => {
  it('is a no-op for an empty list', () => {
    expect(() => throwIfMalformedFieldLinkage([])).not.toThrow();
  });

  it('throws a structured 400 with typed field_linkage_malformed attributes', () => {
    expect.assertions(4);
    try {
      throwIfMalformedFieldLinkage([{ key: 'text_key_1', reason: 'duplicate_legacy_key' }]);
    } catch (error) {
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(400);
      expect(error.message).toContain('"text_key_1" (duplicate_legacy_key)');
      expect(getTypedApiErrorAttributes(error)).toEqual({
        code: 'field_linkage_malformed',
        fields: [{ key: 'text_key_1', reason: 'duplicate_legacy_key' }],
      });
    }
  });
});

describe('logUnresolvedMirrorKeys', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('does not log for an empty list', () => {
    logUnresolvedMirrorKeys([], { owner: 'cases', logger });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs one warning naming the skipped keys and owner', () => {
    logUnresolvedMirrorKeys(['a', 'b'], { owner: 'cases', logger });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[a, b]'));
  });
});
