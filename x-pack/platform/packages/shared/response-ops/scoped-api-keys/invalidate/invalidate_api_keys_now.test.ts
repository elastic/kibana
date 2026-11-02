/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { invalidateApiKeysNow } from './invalidate_api_keys_now';

const opts = { logContext: 'alerting rule : my-rule', logTags: ['uiam'] };

const setup = () => {
  const security = securityServiceMock.createStart();
  const logger = loggingSystemMock.createLogger();
  security.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
    invalidated_api_keys: ['es-id'],
    previously_invalidated_api_keys: [],
    error_count: 0,
  });
  security.authc.apiKeys.uiam!.invalidate.mockResolvedValue({
    invalidated_api_keys: ['uiam-id'],
    previously_invalidated_api_keys: [],
    error_count: 0,
  });
  return { security, logger, deps: { security, logger } };
};

describe('invalidateApiKeysNow', () => {
  test('invalidates ES keys as the internal user and UIAM keys with their own secret', async () => {
    const { security, deps } = setup();

    const failed = await invalidateApiKeysNow(
      deps,
      [{ apiKeyId: 'es-id' }, { apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret:with:colons' }],
      opts
    );

    expect(failed).toEqual([]);
    expect(security.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
      ids: ['es-id'],
    });
    const [request, params] = security.authc.apiKeys.uiam!.invalidate.mock.calls[0];
    expect(request.headers.authorization).toBe('ApiKey essu_secret:with:colons');
    expect(params).toEqual({ id: 'uiam-id' });
  });

  test('returns an ES key that Elasticsearch did not find', async () => {
    const { security, logger, deps } = setup();
    security.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
      invalidated_api_keys: [],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });

    const failed = await invalidateApiKeysNow(deps, [{ apiKeyId: 'es-id' }], opts);

    expect(failed).toEqual([{ apiKeyId: 'es-id' }]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Synchronous ES API key invalidation found no key for alerting rule : my-rule.'
    );
  });

  test('treats an ES key as handled when API keys are disabled', async () => {
    const { security, deps } = setup();
    security.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue(null);

    expect(await invalidateApiKeysNow(deps, [{ apiKeyId: 'es-id' }], opts)).toEqual([]);
  });

  test('returns the keys whose invalidation threw, and never throws', async () => {
    const { security, logger, deps } = setup();
    security.authc.apiKeys.invalidateAsInternalUser.mockRejectedValue(new Error('es down'));
    security.authc.apiKeys.uiam!.invalidate.mockRejectedValue(new Error('uiam down'));
    const targets = [{ apiKeyId: 'es-id' }, { apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret' }];

    expect(await invalidateApiKeysNow(deps, targets, opts)).toEqual(targets);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to synchronously invalidate ES API key for alerting rule : my-rule: es down',
      expect.any(Object)
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to synchronously invalidate UIAM API key for alerting rule : my-rule: uiam down',
      expect.objectContaining({ tags: ['uiam'] })
    );
  });

  test('logs a UIAM error result without returning the key', async () => {
    const { security, logger, deps } = setup();
    security.authc.apiKeys.uiam!.invalidate.mockResolvedValue({
      invalidated_api_keys: [],
      previously_invalidated_api_keys: [],
      error_count: 1,
      error_details: [{ type: 'error', reason: 'not found' }],
    });

    const failed = await invalidateApiKeysNow(
      deps,
      [{ apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret' }],
      opts
    );

    expect(failed).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to synchronously invalidate UIAM API key for alerting rule : my-rule: not found',
      { tags: ['uiam'] }
    );
  });

  test('does nothing for an empty list', async () => {
    const { security, deps } = setup();

    expect(await invalidateApiKeysNow(deps, [], opts)).toEqual([]);
    expect(security.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
  });
});
