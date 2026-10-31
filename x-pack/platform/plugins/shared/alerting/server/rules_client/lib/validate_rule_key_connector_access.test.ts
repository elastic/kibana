/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { isExternalUiamCredential } from '@kbn/core-security-server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';

import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import type { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { backfillClientMock } from '../../backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../..';
import {
  CALLER_PRINCIPAL,
  getBeforeSetup,
  refuseConnector,
  setupRuleKeyConnectorAccess,
} from '../tests/lib';
import type { RulesClientContext } from '../types';
import {
  getReferencedConnectorIds,
  validateNewRuleKeyConnectorAccess,
  validateRuleKeyConnectorAccess,
} from './validate_rule_key_connector_access';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

const rulesClientParams: jest.Mocked<RulesClientContext> = {
  request: httpServerMock.createKibanaRequest(),
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: alertingAuthorizationMock.create() as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorizationMock.create() as unknown as ActionsAuthorization,
  spaceId: 'space-1',
  getUserName: jest.fn(),
  getProfileUid: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository: savedObjectsRepositoryMock.create(),
  encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion: 'v8.0.0',
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  minimumScheduleIntervalInMs: 1,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  cloneAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
  isServerless: false,
};

const API_KEY = Buffer.from('key-id:key-secret').toString('base64');
const UIAM_API_KEY = Buffer.from('uiam-id:essu_secret').toString('base64');

const baseParams = {
  spaceId: 'space-1',
  connectorIds: ['restricted', 'public'],
  apiKey: API_KEY,
  createdInThisRequest: true,
};

const getKeyRequest = (
  getActionsClientWithRequest: jest.Mock,
  callIndex = 0
): KibanaRequest & { spaceId?: string } => getActionsClientWithRequest.mock.calls[callIndex][0];

describe('validateRuleKeyConnectorAccess', () => {
  beforeEach(() => {
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  });

  it('validates the key against the restricted connectors only', async () => {
    const { options, actionsClient, keyActionsClient, getActionsClientWithRequest } =
      await setupRuleKeyConnectorAccess(rulesClientParams, ['restricted']);

    await validateRuleKeyConnectorAccess(options, baseParams);

    expect(actionsClient.getRestrictedConnectorIds).toHaveBeenCalledWith(['restricted', 'public']);
    expect(keyActionsClient.ensureConnectorsUsable).toHaveBeenCalledWith(['restricted'], {
      principal: CALLER_PRINCIPAL,
    });
    const keyRequest = getKeyRequest(getActionsClientWithRequest);
    expect(keyRequest.headers.authorization).toBe(`ApiKey ${API_KEY}`);
    expect(keyRequest.spaceId).toBe('space-1');
    expect(keyRequest.isFakeRequest).toBe(true);
  });

  it('lets a retained key resolve its own principal', async () => {
    const { options, keyActionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, [
      'restricted',
    ]);

    await validateRuleKeyConnectorAccess(options, { ...baseParams, createdInThisRequest: false });

    expect(options.accessControl.asScoped).not.toHaveBeenCalled();
    expect(keyActionsClient.ensureConnectorsUsable).toHaveBeenCalledWith(['restricted'], {
      principal: undefined,
    });
  });

  it('refuses a key that cannot use a restricted connector', async () => {
    const { options, keyActionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, [
      'restricted',
    ]);
    refuseConnector(keyActionsClient, 'restricted');

    const error = await validateRuleKeyConnectorAccess(options, baseParams).catch((e) => e);

    expect(error.output.statusCode).toBe(403);
    expect(error.message).toBe(`The rule's API key cannot use connector "restricted"`);
  });

  it('rethrows an error that does not refuse a connector', async () => {
    const { options, keyActionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, [
      'restricted',
    ]);
    keyActionsClient.ensureConnectorsUsable.mockRejectedValue(new Error('cluster unavailable'));

    await expect(validateRuleKeyConnectorAccess(options, baseParams)).rejects.toThrow(
      'cluster unavailable'
    );
  });

  it('makes no extra call when every connector is unrestricted', async () => {
    const { options, actionsClient, getActionsClientWithRequest } =
      await setupRuleKeyConnectorAccess(rulesClientParams, []);

    await validateRuleKeyConnectorAccess(options, baseParams);

    expect(actionsClient.getRestrictedConnectorIds).toHaveBeenCalledTimes(1);
    expect(getActionsClientWithRequest).not.toHaveBeenCalled();
    expect(options.accessControl.asScoped).not.toHaveBeenCalled();
  });

  it('makes no call for system and preconfigured connectors', async () => {
    const { options, actionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, []);
    actionsClient.isPreconfigured.mockImplementation((id) => id === 'preconfigured');

    await validateRuleKeyConnectorAccess(options, {
      ...baseParams,
      connectorIds: ['system_action-id', 'preconfigured'],
    });

    expect(actionsClient.getRestrictedConnectorIds).not.toHaveBeenCalled();
  });

  it('makes no call while object-level security is disabled', async () => {
    const { options, actionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, [
      'restricted',
    ]);
    options.accessControl.isEnabled.mockReturnValue(false);

    await validateRuleKeyConnectorAccess(options, baseParams);

    expect(actionsClient.getRestrictedConnectorIds).not.toHaveBeenCalled();
  });

  it('makes no call for a rule without keys', async () => {
    const { options, actionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, [
      'restricted',
    ]);

    await validateRuleKeyConnectorAccess(options, { ...baseParams, apiKey: null });

    expect(actionsClient.getRestrictedConnectorIds).not.toHaveBeenCalled();
  });

  describe('UIAM API key', () => {
    it('validates it on its own request', async () => {
      const { options, keyActionsClient, getActionsClientWithRequest } =
        await setupRuleKeyConnectorAccess(rulesClientParams, ['restricted']);

      await validateRuleKeyConnectorAccess(options, {
        ...baseParams,
        uiamApiKey: UIAM_API_KEY,
        uiamApiKeyExternal: true,
      });

      expect(keyActionsClient.ensureConnectorsUsable).toHaveBeenCalledTimes(2);
      expect(keyActionsClient.ensureConnectorsUsable).toHaveBeenLastCalledWith(['restricted']);
      const uiamRequest = getKeyRequest(getActionsClientWithRequest, 1);
      expect(uiamRequest.headers.authorization).toBe('ApiKey essu_secret');
      expect(isExternalUiamCredential(uiamRequest)).toBe(true);
      expect(isExternalUiamCredential(getKeyRequest(getActionsClientWithRequest))).toBe(false);
    });

    it('refuses restricted connectors until its principal resolves', async () => {
      const { options, keyActionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, [
        'restricted',
      ]);
      refuseConnector(keyActionsClient, 'restricted');

      await expect(
        validateRuleKeyConnectorAccess(options, {
          ...baseParams,
          apiKey: null,
          uiamApiKey: UIAM_API_KEY,
        })
      ).rejects.toThrow(`The rule's UIAM API key cannot be matched to a user yet (kibana#271760)`);
    });
  });
});

describe('validateNewRuleKeyConnectorAccess', () => {
  beforeEach(() => {
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  });

  const keySet = {
    apiKey: API_KEY,
    apiKeyCreatedByUser: false,
    uiamApiKey: UIAM_API_KEY,
    uiamApiKeyExternal: false,
  };

  it('invalidates both keys created in this request when they are refused', async () => {
    const { options, keyActionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, [
      'restricted',
    ]);
    refuseConnector(keyActionsClient, 'restricted');

    await expect(
      validateNewRuleKeyConnectorAccess(options, {
        spaceId: 'space-1',
        connectorIds: ['restricted'],
        keySet,
      })
    ).rejects.toThrow(`The rule's API key cannot use connector "restricted"`);

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
      {
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        attributes: expect.objectContaining({ apiKeyId: 'key-id' }),
      },
      {
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        attributes: expect.objectContaining({ apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret' }),
      },
    ]);
  });

  it('keeps the caller-owned key when it is refused', async () => {
    const { options, keyActionsClient } = await setupRuleKeyConnectorAccess(rulesClientParams, [
      'restricted',
    ]);
    refuseConnector(keyActionsClient, 'restricted');

    await expect(
      validateNewRuleKeyConnectorAccess(options, {
        spaceId: 'space-1',
        connectorIds: ['restricted'],
        keySet: { apiKey: API_KEY, apiKeyCreatedByUser: true },
      })
    ).rejects.toThrow(`The rule's API key cannot use connector "restricted"`);

    expect(keyActionsClient.ensureConnectorsUsable).toHaveBeenCalledWith(['restricted'], {
      principal: undefined,
    });
    expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('keeps the keys when they are permitted', async () => {
    const { options } = await setupRuleKeyConnectorAccess(rulesClientParams, ['restricted']);

    await validateNewRuleKeyConnectorAccess(options, {
      spaceId: 'space-1',
      connectorIds: ['restricted'],
      keySet,
    });

    expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
  });
});

describe('getReferencedConnectorIds', () => {
  it('returns the IDs of action references', () => {
    expect(
      getReferencedConnectorIds([
        { type: 'action', id: 'c1', name: 'action_0' },
        { type: 'index-pattern', id: 'ip', name: 'param:ip' },
        { type: 'action', id: 'c2', name: 'action_1' },
      ])
    ).toEqual(['c1', 'c2']);
    expect(getReferencedConnectorIds(undefined)).toEqual([]);
  });
});
