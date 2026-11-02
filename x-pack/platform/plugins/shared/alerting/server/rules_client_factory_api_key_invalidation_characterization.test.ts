/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientFactoryOpts } from './rules_client_factory';
import { RulesClientFactory } from './rules_client_factory';
import { ApiKeyType } from './task_runner/types';
import { ruleTypeRegistryMock } from './rule_type_registry.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  savedObjectsServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
  securityServiceMock,
  analyticsServiceMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import { alertingAuthorizationClientFactoryMock } from './alerting_authorization_client_factory.mock';
import type { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { backfillClientMock } from './backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from './connector_adapters/connector_adapter_registry';
import type { SecurityStartMock } from '@kbn/core-security-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { bulkMarkApiKeysForInvalidation } from './invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { UIAM_LOGS_INVALIDATE_TAGS } from './constants';
import type { ConstructorOptions } from './rules_client';

jest.mock('./rules_client');
jest.mock('./authorization/alerting_authorization');
jest.mock('./invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation');

const encode = (value: string) => Buffer.from(value).toString('base64');
const ES_KEY = encode('es-id:es-secret');
const UIAM_KEY = encode('uiam-id:essu_uiam_secret');

const emptyInvalidateResult = {
  invalidated_api_keys: [],
  previously_invalidated_api_keys: [],
  error_count: 0,
};

describe('RulesClientFactory invalidateApiKeyNow() characterization', () => {
  let securityService: SecurityStartMock;
  let rulesClientFactoryParams: jest.Mocked<RulesClientFactoryOpts>;
  let uiamInvalidate: jest.Mock;

  const setup = async (): Promise<ConstructorOptions> => {
    const factory = new RulesClientFactory();
    factory.initialize({
      ...rulesClientFactoryParams,
      securityService,
      securityPluginSetup: securityMock.createSetup(),
      securityPluginStart: securityMock.createStart(),
      shouldGrantUiam: true,
    });
    await factory.create(
      mockRouter.createKibanaRequest({ headers: { authorization: 'Basic non-uiam-caller' } }),
      savedObjectsServiceMock.createInternalStartContract()
    );
    return jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];
  };

  const invalidateNow = async (params: { apiKey?: string | null; uiamApiKey?: string | null }) => {
    const { invalidateApiKeyNow } = await setup();
    await invalidateApiKeyNow?.({ ruleName: 'rule-x', ...params });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    securityService = securityServiceMock.createStart();
    uiamInvalidate = jest.fn().mockResolvedValue({ error_count: 0 });
    securityService.authc.apiKeys.uiam = {
      grant: jest.fn(),
      invalidate: uiamInvalidate,
    } as never;

    const getSpaceId = jest.fn().mockReturnValue(asSpaceId('default'));
    const uiSettings = uiSettingsServiceMock.createStartContract();
    uiSettings.asScopedToClient = uiSettingsServiceMock.createStartContract().asScopedToClient;

    rulesClientFactoryParams = {
      logger: loggingSystemMock.create().get(),
      taskManager: taskManagerMock.createStart(),
      ruleTypeRegistry: ruleTypeRegistryMock.create(),
      getSpaceId,
      spaceIdToNamespace: jest.fn().mockReturnValue('default'),
      maxScheduledPerMinute: 10000,
      minimumScheduleInterval: { value: '1m', enforce: false },
      internalSavedObjectsRepository: savedObjectsRepositoryMock.create(),
      encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
      actions: actionsMock.createStart(),
      eventLog: eventLogMock.createStart(),
      kibanaVersion: '7.10.0',
      authorization:
        alertingAuthorizationClientFactoryMock.createFactory() as unknown as AlertingAuthorizationClientFactory,
      backfillClient: backfillClientMock.create(),
      connectorAdapterRegistry: new ConnectorAdapterRegistry(),
      uiSettings,
      securityService,
      getAlertIndicesAlias: jest.fn(),
      alertsService: null,
      shouldGrantUiam: true,
      apiKeyType: ApiKeyType.ES,
      isServerless: false,
      analytics: analyticsServiceMock.createAnalyticsServiceStart(),
    };
  });

  test('invalidates both ES and UIAM keys when both are passed', async () => {
    securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValueOnce({
      ...emptyInvalidateResult,
      invalidated_api_keys: ['es-id'],
    });

    await invalidateNow({ apiKey: ES_KEY, uiamApiKey: UIAM_KEY });

    expect(securityService.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledTimes(1);
    expect(securityService.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
      ids: ['es-id'],
    });
    expect(uiamInvalidate).toHaveBeenCalledTimes(1);
    expect(uiamInvalidate.mock.calls[0][1]).toEqual({ id: 'uiam-id' });
    expect(uiamInvalidate.mock.calls[0][0].headers.authorization).toBe('ApiKey essu_uiam_secret');
    expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
  });

  test('queues only the ES key (not the UIAM key) when ES invalidation finds nothing', async () => {
    securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValueOnce(
      emptyInvalidateResult
    );

    await invalidateNow({ apiKey: ES_KEY, uiamApiKey: UIAM_KEY });

    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: [ES_KEY] },
      rulesClientFactoryParams.logger,
      rulesClientFactoryParams.internalSavedObjectsRepository
    );
  });

  test('logs and also queues when ES invalidation reports errors and invalidated nothing', async () => {
    securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValueOnce({
      ...emptyInvalidateResult,
      error_count: 1,
      error_details: [{ type: 'x', reason: 'boom' }],
    });

    await invalidateNow({ apiKey: ES_KEY });

    expect(rulesClientFactoryParams.logger.error).toHaveBeenCalledWith(
      'Failed to synchronously invalidate ES API key for alerting rule : rule-x: boom'
    );
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: [ES_KEY] },
      rulesClientFactoryParams.logger,
      rulesClientFactoryParams.internalSavedObjectsRepository
    );
  });

  test('does not queue when ES invalidation returns null', async () => {
    securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValueOnce(null);

    await invalidateNow({ apiKey: ES_KEY });

    expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
  });

  test('logs and queues the key, without throwing, when ES invalidation throws', async () => {
    const error = new Error('es down');
    securityService.authc.apiKeys.invalidateAsInternalUser.mockRejectedValueOnce(error);

    await expect(invalidateNow({ apiKey: ES_KEY })).resolves.toBeUndefined();

    expect(rulesClientFactoryParams.logger.error).toHaveBeenCalledWith(
      'Failed to synchronously invalidate ES API key for alerting rule : rule-x: es down',
      { error: { stack_trace: error.stack } }
    );
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: [ES_KEY] },
      rulesClientFactoryParams.logger,
      rulesClientFactoryParams.internalSavedObjectsRepository
    );
  });

  test('logs and queues the key, without throwing, when UIAM invalidation throws', async () => {
    const error = new Error('uiam down');
    uiamInvalidate.mockRejectedValueOnce(error);

    await expect(invalidateNow({ uiamApiKey: UIAM_KEY })).resolves.toBeUndefined();

    expect(rulesClientFactoryParams.logger.error).toHaveBeenCalledWith(
      'Failed to synchronously invalidate UIAM API key for alerting rule : rule-x: uiam down',
      { tags: UIAM_LOGS_INVALIDATE_TAGS, error: { stack_trace: error.stack } }
    );
    expect(securityService.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: [UIAM_KEY] },
      rulesClientFactoryParams.logger,
      rulesClientFactoryParams.internalSavedObjectsRepository
    );
  });

  test('logs a non-UIAM credential error for a raw essu_ uiamApiKey and invalidates nothing', async () => {
    await invalidateNow({ uiamApiKey: 'essu_raw_user_key' });

    expect(uiamInvalidate).not.toHaveBeenCalled();
    expect(securityService.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
    expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
    expect(rulesClientFactoryParams.logger.error).toHaveBeenCalledWith(
      'Failed to synchronously invalidate UIAM API key for alerting rule : rule-x: stored credential is not a UIAM API key',
      { tags: UIAM_LOGS_INVALIDATE_TAGS }
    );
  });

  test('keeps colons in the stored UIAM secret', async () => {
    await invalidateNow({ uiamApiKey: encode('uiam-id:essu_secret:extra') });

    expect(uiamInvalidate.mock.calls[0][1]).toEqual({ id: 'uiam-id' });
    expect(uiamInvalidate.mock.calls[0][0].headers.authorization).toBe('ApiKey essu_secret:extra');
  });

  test('skips ES invalidation when the decoded ES key id is blank', async () => {
    await invalidateNow({ apiKey: encode(' :secret') });

    expect(securityService.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
    expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
  });
});
