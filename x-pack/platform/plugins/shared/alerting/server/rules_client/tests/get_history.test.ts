/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConstructorOptions } from '../rules_client';
import { RulesClient } from '../rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
  coreFeatureFlagsMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../authorization/alerting_authorization';
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/mocks';
import type { SavedObject } from '@kbn/core/server';
import type { RawRule } from '../../types';
import { getBeforeSetup, mockedDateString, setGlobalDate } from './lib';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { backfillClientMock } from '../../backfill_client/backfill_client.mock';
import type { IChangeTrackingService } from '../lib/change_tracking';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const eventLogClient = eventLogClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
  featureFlags: coreFeatureFlagsMock.createStart(),
  isServerless: false,
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry, eventLogClient);
});

setGlobalDate();

const RuleIntervalSeconds = 1;

const BaseRuleSavedObject: SavedObject<RawRule> = {
  id: '1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    enabled: true,
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: '123',
    consumer: 'rule-consumer',
    legacyId: null,
    schedule: { interval: `${RuleIntervalSeconds}s` },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: mockedDateString,
    updatedAt: mockedDateString,
    apiKey: null,
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: '2020-08-20T19:23:38Z',
      error: null,
      warning: null,
    },
    revision: 0,
  },
  references: [],
};

function getRuleSavedObject(attributes: Partial<RawRule> = {}): SavedObject<RawRule> {
  return {
    ...BaseRuleSavedObject,
    attributes: { ...BaseRuleSavedObject.attributes, ...attributes },
  };
}

function createChangeTrackingServiceMock(): jest.Mocked<IChangeTrackingService> {
  return {
    register: jest.fn(),
    isInitialized: jest.fn(),
    initialize: jest.fn(),
    log: jest.fn(),
    logBulk: jest.fn(),
    getHistory: jest.fn(),
  };
}

describe('getHistory()', () => {
  let rulesClient: RulesClient;

  test('returns empty history when change tracking is unavailable', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    rulesClient = new RulesClient(rulesClientParams);

    const result = await rulesClient.getHistory({ module: 'stack', ruleId: '1' });

    expect(result).toEqual({ total: 0, items: [] });
  });

  test('returns empty history and skips getHistory when change tracking is not initialized', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    const changeTrackingService = createChangeTrackingServiceMock();
    changeTrackingService.isInitialized.mockReturnValue(false);
    rulesClient = new RulesClient({ ...rulesClientParams, changeTrackingService });

    const result = await rulesClient.getHistory({ module: 'stack', ruleId: '1' });

    expect(result).toEqual({ total: 0, items: [] });
    expect(changeTrackingService.getHistory).not.toHaveBeenCalled();
  });

  test('delegates to change tracking with pagination and optional changeId filter when initialized', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    const changeTrackingService = createChangeTrackingServiceMock();
    changeTrackingService.isInitialized.mockReturnValue(true);
    changeTrackingService.getHistory.mockResolvedValue({ total: 3, items: [] });
    rulesClient = new RulesClient({ ...rulesClientParams, changeTrackingService });

    const result = await rulesClient.getHistory({
      module: 'stack',
      ruleId: '1',
      page: 2,
      perPage: 25,
      changeId: 'change-abc',
    });

    expect(result).toEqual({ total: 3, items: [] });
    expect(changeTrackingService.getHistory).toHaveBeenCalledWith('stack', 'default', '1', {
      size: 25,
      from: 25,
      additionalFilters: [{ term: { 'event.id': 'change-abc' } }],
    });
  });

  test('ensures user is authorized to read rule history', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    rulesClient = new RulesClient(rulesClientParams);

    await rulesClient.getHistory({ module: 'stack', ruleId: '1' });

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
      entity: 'rule',
      consumer: 'rule-consumer',
      operation: 'getHistory',
      ruleTypeId: '123',
    });
  });
});
