/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { SavedObject, Logger, KibanaRequest } from '@kbn/core/server';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import type { AlertingAuthorization } from '../../../../../authorization';
import { alertingAuthorizationMock } from '../../../../../authorization/alerting_authorization.mock';
import { ruleTypeRegistryMock } from '../../../../../rule_type_registry.mock';
import type { ConstructorOptions } from '../../../../../rules_client';
import { RulesClient } from '../../../../../rules_client';
import { ConnectorAdapterRegistry } from '../../../../../connector_adapters/connector_adapter_registry';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../../saved_objects';
import type { GapAutoFillSchedulerSO } from '../../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { backfillClientMock } from '../../../../../backfill_client/backfill_client.mock';
import type { UpdateGapAutoFillSchedulerParams } from './types';

const kibanaVersion = 'v8.0.0';
const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const actionsClient = actionsClientMock.create();
const eventLogger = eventLoggerMock.create();
const eventLogClient = eventLogClientMock.create();
const backfillClient = backfillClientMock.create();

const rulesClientParamsBase: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn().mockResolvedValue('elastic'),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get() as Logger,
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient,
  isSystemAction: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  eventLogger,
};

const defaultRuleType = { type: 'test-rule-type', consumer: 'test-consumer' };

const getParams = (overrides: Partial<UpdateGapAutoFillSchedulerParams> = {}) =>
  ({
    id: 'scheduler-1',
    name: 'updated name',
    enabled: true,
    schedule: { interval: '2h' },
    gapFillRange: 'now-30d',
    maxBackfills: 200,
    numRetries: 5,
    scope: ['scope-a'],
    ruleTypes: [defaultRuleType],
    request: {} as KibanaRequest,
    ...overrides,
  } satisfies UpdateGapAutoFillSchedulerParams);

function setupSchedulerSo(attrs?: Partial<GapAutoFillSchedulerSO>) {
  const so: SavedObject<GapAutoFillSchedulerSO> = {
    id: 'scheduler-1',
    type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
    attributes: {
      id: 'scheduler-1',
      name: 'gap-scheduler',
      enabled: true,
      schedule: { interval: '1h' },
      gapFillRange: 'now-90d',
      maxBackfills: 100,
      numRetries: 3,
      scope: ['scope-a'],
      ruleTypes: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
      ruleTypeConsumerPairs: ['test-rule-type:test-consumer'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'elastic',
      updatedBy: 'elastic',
      ...attrs,
    },
    references: [],
  };
  unsecuredSavedObjectsClient.get.mockResolvedValue(so);
  return so;
}

describe('updateGapAutoFillScheduler()', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    jest.resetAllMocks();

    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 1,
      page: 1,
    });

    rulesClient = new RulesClient(rulesClientParamsBase);
    rulesClientParamsBase.getActionsClient.mockResolvedValue(actionsClient);
    rulesClientParamsBase.getEventLogClient.mockResolvedValue(eventLogClient);
  });

  test('updates scheduler attributes and ensures task when enabled', async () => {
    const existingSo = setupSchedulerSo();
    const updatedSo: SavedObject<GapAutoFillSchedulerSO> = {
      ...existingSo,
      attributes: {
        ...existingSo.attributes,
        name: 'updated name',
        schedule: { interval: '2h' },
        gapFillRange: 'now-30d',
        maxBackfills: 200,
        numRetries: 5,
        scope: ['scope-a'],
        updatedAt: new Date().toISOString(),
        updatedBy: 'elastic',
      },
    };
    unsecuredSavedObjectsClient.update.mockResolvedValue(updatedSo);
    // Mock get to return updatedSo on the second call (after update)
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(updatedSo);

    const params = getParams();
    await rulesClient.updateGapAutoFillScheduler(params);

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id,
      expect.objectContaining({
        name: 'updated name',
        schedule: { interval: '2h' },
        scope: ['scope-a'],
      })
    );

    expect(taskManager.removeIfExists).toHaveBeenCalledWith(updatedSo.id);
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: updatedSo.id,
        schedule: { interval: '2h' },
        scope: ['scope-a'],
      }),
      { request: params.request }
    );
    expect(backfillClient.deleteBackfillsByInitiatorId).not.toHaveBeenCalled();
  });

  test('disables scheduler, removes task, and deletes backfills when enabled is set to false', async () => {
    const existingSo = setupSchedulerSo();
    unsecuredSavedObjectsClient.update.mockResolvedValue(existingSo);

    const params = getParams({ enabled: false });
    await rulesClient.updateGapAutoFillScheduler(params);

    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(existingSo.id);
    expect(backfillClient.deleteBackfillsByInitiatorId).toHaveBeenCalledWith(
      expect.objectContaining({
        initiatorId: existingSo.id,
        unsecuredSavedObjectsClient,
        shouldUpdateGaps: true,
        internalSavedObjectsRepository,
        eventLogClient,
        eventLogger,
        actionsClient,
      })
    );
  });

  test('updates ruleTypes and ruleTypeConsumerPairs when rule types change', async () => {
    const existingSo = setupSchedulerSo();

    const updatedRuleTypes: GapAutoFillSchedulerSO['ruleTypes'] = [
      { type: 'another-rule-type', consumer: 'another-consumer' },
    ];
    const updatedRuleTypePairs = ['another-rule-type:another-consumer'];

    const updatedSo: SavedObject<GapAutoFillSchedulerSO> = {
      ...existingSo,
      attributes: {
        ...existingSo.attributes,
        ruleTypes: updatedRuleTypes,
        ruleTypeConsumerPairs: updatedRuleTypePairs,
      },
    };

    unsecuredSavedObjectsClient.update.mockResolvedValue(updatedSo);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingSo);

    const params = getParams({ ruleTypes: updatedRuleTypes });
    await rulesClient.updateGapAutoFillScheduler(params);

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      perPage: 2,
      filter:
        '(' +
        updatedRuleTypePairs
          .map(
            (pair) =>
              `${GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE}.attributes.ruleTypeConsumerPairs: "${pair}"`
          )
          .join(' or ') +
        ')',
    });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id,
      expect.objectContaining({
        ruleTypes: updatedRuleTypes,
        ruleTypeConsumerPairs: updatedRuleTypePairs,
      })
    );

    // Authorization is checked for both existing and new rule types
    expect(authorization.ensureAuthorized).toHaveBeenCalledTimes(2);
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleTypeId: 'another-rule-type',
        consumer: 'another-consumer',
      })
    );
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleTypeId: 'test-rule-type',
        consumer: 'test-consumer',
      })
    );
  });

  test('validates params and throws on invalid payload', async () => {
    expect.assertions(2);

    try {
      await rulesClient.updateGapAutoFillScheduler({
        id: 'scheduler-1',
        request: {} as KibanaRequest,
      } as UpdateGapAutoFillSchedulerParams);
    } catch (err) {
      const message = String((err as Error).message ?? err);
      expect(message).toMatch(/Error validating gap auto fill scheduler update parameters/);
      expect(message).not.toContain('"request"');
    }
  });

  test('logs and rethrows when authorization fails', async () => {
    setupSchedulerSo();
    (authorization.ensureAuthorized as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no access');
    });

    await expect(
      rulesClient.updateGapAutoFillScheduler(getParams({ request: {} as KibanaRequest }))
    ).rejects.toThrow('no access');

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'gap_auto_fill_scheduler_update' }),
        error: expect.any(Object),
      })
    );
  });

  test('throws when rule type is not registered', async () => {
    setupSchedulerSo();
    ruleTypeRegistry.get.mockImplementationOnce(() => {
      throw new Error('unknown rule type');
    });

    await expect(rulesClient.updateGapAutoFillScheduler(getParams())).rejects.toThrow(
      'unknown rule type'
    );
  });
});
