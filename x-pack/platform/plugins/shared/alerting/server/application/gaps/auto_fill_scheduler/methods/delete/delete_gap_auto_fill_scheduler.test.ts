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
import type { SavedObject, Logger } from '@kbn/core/server';
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
import type { GetGapAutoFillSchedulerParams } from '../types';

describe('deleteGapAutoFillScheduler()', () => {
  const kibanaVersion = 'v8.0.0';
  const taskManager = taskManagerMock.createStart();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  const authorization = alertingAuthorizationMock.create();
  const actionsAuthorization = actionsAuthorizationMock.create();
  const auditLogger = auditLoggerMock.create();
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const logger: Logger = loggingSystemMock.create().get();

  const actionsClient = actionsClientMock.create();
  const eventLogger = eventLoggerMock.create();
  const eventLogClient = eventLogClientMock.create();

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
    logger,
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
    backfillClient: backfillClientMock.create(),
    isSystemAction: jest.fn(),
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    eventLogger,
  };

  function setupSchedulerSo(attrs?: Partial<GapAutoFillSchedulerSO>) {
    const so: SavedObject<GapAutoFillSchedulerSO> = {
      id: 'scheduler-1',
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: {
        id: 'scheduler-1',
        name: 'auto-fill',
        enabled: true,
        schedule: { interval: '1h' },
        gapFillRange: 'now-1d',
        maxBackfills: 100,
        numRetries: 3,
        scope: ['test-space'],
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

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('removes task, deletes SO, deletes backfills and audits success', async () => {
    rulesClientParamsBase.getEventLogClient.mockResolvedValue(eventLogClient);
    rulesClientParamsBase.getActionsClient.mockResolvedValue(actionsClient);
    const rulesClient = new RulesClient(rulesClientParamsBase);

    const so = setupSchedulerSo();

    const params = { id: so.id };
    await expect(rulesClient.deleteGapAutoFillScheduler(params)).resolves.toBeUndefined();

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id
    );

    // scheduledTaskId is the SO id for this scheduler
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(so.id);

    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      params.id
    );

    expect(rulesClientParamsBase.getEventLogClient).toHaveBeenCalled();
    expect(rulesClientParamsBase.getActionsClient).toHaveBeenCalled();

    // backfills are deleted and gaps updated
    const backfillClientInstance = rulesClient.getContext().backfillClient;
    expect(backfillClientInstance.deleteBackfillsByInitiatorId).toHaveBeenCalledWith(
      expect.objectContaining({
        initiatorId: so.id,
        unsecuredSavedObjectsClient,
        shouldUpdateGaps: true,
        internalSavedObjectsRepository,
        eventLogClient,
        eventLogger,
        actionsClient,
      })
    );

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'gap_auto_fill_scheduler_delete' }),
        kibana: expect.objectContaining({
          saved_object: expect.objectContaining({
            type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
            id: params.id,
            name: so.attributes.name,
          }),
        }),
      })
    );
  });

  test('validates params and throws on invalid', async () => {
    const rulesClient = new RulesClient({
      ...rulesClientParamsBase,
      backfillClient: backfillClientMock.create(),
    });

    const invalidParams = { id: 123 as unknown as string };
    await expect(
      rulesClient.deleteGapAutoFillScheduler(
        invalidParams as unknown as GetGapAutoFillSchedulerParams
      )
    ).rejects.toThrow(/Error validating gap auto fill scheduler delete parameters/);
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  test('logs and rethrows when authorization fails', async () => {
    const rulesClient = new RulesClient({
      ...rulesClientParamsBase,
      backfillClient: backfillClientMock.create(),
    });

    setupSchedulerSo();
    (authorization.ensureAuthorized as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no access');
    });

    await expect(rulesClient.deleteGapAutoFillScheduler({ id: 'scheduler-1' })).rejects.toThrow(
      'no access'
    );

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: 'gap_auto_fill_scheduler_delete' }),
        error: expect.any(Object),
      })
    );
  });

  test('wraps unexpected errors and logs them', async () => {
    const rulesClient = new RulesClient({
      ...rulesClientParamsBase,
      backfillClient: backfillClientMock.create(),
    });

    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('not found'));
    await expect(rulesClient.deleteGapAutoFillScheduler({ id: 'unknown' })).rejects.toThrow(
      /Failed to delete gap auto fill scheduler by id: unknown/
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete gap auto fill scheduler by id: unknown')
    );
  });
});
