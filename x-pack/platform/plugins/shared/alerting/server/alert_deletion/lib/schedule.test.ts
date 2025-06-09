/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { AlertDeletionClient } from '../alert_deletion_client';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server/spaces_service';

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: jest.fn(),
} as unknown as KibanaRequest;

const auditService = securityServiceMock.createStart().audit;
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const eventLogger = eventLoggerMock.create();
const getAlertIndicesAliasMock = jest.fn();
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const securityServiceStart = securityServiceMock.createStart();
const getSpaceId = jest.fn();
const spacesService = { getSpaceId } as unknown as SpacesServiceStart;
const taskManagerSetup = taskManagerMock.createSetup();
const taskManagerStart = taskManagerMock.createStart();

describe('scheduleTask', () => {
  let alertDeletionClient: AlertDeletionClient;

  beforeEach(() => {
    jest.resetAllMocks();
    logger.get.mockImplementation(() => logger);
    getAlertIndicesAliasMock.mockReturnValue(['index1', 'index2']);
    // @ts-ignore - incomplete return type
    securityServiceStart.authc.getCurrentUser.mockReturnValue({ username: 'test_user' });
    alertDeletionClient = new AlertDeletionClient({
      auditService,
      elasticsearchClientPromise: Promise.resolve(esClient),
      eventLogger,
      getAlertIndicesAlias: getAlertIndicesAliasMock,
      logger,
      ruleTypeRegistry,
      securityService: Promise.resolve(securityServiceStart),
      spacesService: Promise.resolve(spacesService),
      taskManagerSetup,
      taskManagerStartPromise: Promise.resolve(taskManagerStart),
    });
  });

  test('should schedule ad hoc task with given settings and space IDs', async () => {
    const auditLog = auditService.withoutRequest;
    auditService.asScoped = jest.fn(() => auditLog);

    await alertDeletionClient.scheduleTask(
      fakeRequest,
      {
        isActiveAlertDeleteEnabled: false,
        isInactiveAlertDeleteEnabled: true,
        activeAlertDeleteThreshold: 1,
        inactiveAlertDeleteThreshold: 30,
        categoryIds: ['observability', 'management', 'securitySolution'],
      },
      ['space-1', 'default']
    );
    expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith({
      id: `Alerting-alert-deletion`,
      taskType: 'alert-deletion',
      params: {
        settings: {
          isActiveAlertDeleteEnabled: false,
          isInactiveAlertDeleteEnabled: true,
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 30,
          categoryIds: ['observability', 'management', 'securitySolution'],
        },
        spaceIds: ['space-1', 'default'],
      },
      state: {},
      scope: ['alerting'],
    });
    expect(auditLog.log).toHaveBeenCalledWith({
      message: `test_user has scheduled deletion task for alerts`,
      event: {
        action: 'alert_schedule_delete',
        category: ['database'],
        outcome: 'success',
        type: ['deletion'],
      },
    });
  });

  test('should log and re-throw error if error scheduling task', async () => {
    const auditLog = auditService.withoutRequest;
    auditService.asScoped = jest.fn(() => auditLog);
    taskManagerStart.ensureScheduled.mockRejectedValueOnce(new Error('Failed to schedule task'));
    await expect(
      alertDeletionClient.scheduleTask(
        fakeRequest,
        {
          isActiveAlertDeleteEnabled: false,
          isInactiveAlertDeleteEnabled: true,
          activeAlertDeleteThreshold: 1,
          inactiveAlertDeleteThreshold: 30,
          categoryIds: ['observability', 'management', 'securitySolution'],
        },
        ['space-1']
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failed to schedule task"`);
    expect(logger.error).toHaveBeenCalledWith(
      'Error scheduling alert deletion task: Failed to schedule task'
    );
    expect(auditLog.log).toHaveBeenCalledWith({
      message: `Failed attempt to schedule deletion task for alerts`,
      event: {
        action: 'alert_schedule_delete',
        category: ['database'],
        outcome: 'failure',
        type: ['deletion'],
      },
      error: {
        code: 'Error',
        message: 'Failed to schedule task',
      },
    });
  });
});
