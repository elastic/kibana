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
import { TaskStatus } from '@kbn/task-manager-plugin/server';

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
    taskManagerStart.fetch.mockResolvedValueOnce({
      docs: [],
      versionMap: new Map(),
    });

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
    expect(taskManagerStart.schedule).toHaveBeenCalledWith({
      id: expect.stringContaining('Alerting-alert-deletion-'),
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

  test('should skip scheduling task and return message if task is already running for spaceID', async () => {
    const auditLog = auditService.withoutRequest;
    auditService.asScoped = jest.fn(() => auditLog);
    taskManagerStart.fetch.mockResolvedValueOnce({
      docs: [
        {
          taskType: 'alert-deletion',
          scope: ['alerting'],
          state: {},
          params: {
            settings: {
              isActiveAlertDeleteEnabled: true,
              isInactiveAlertDeleteEnabled: false,
              activeAlertDeleteThreshold: 1,
              inactiveAlertDeleteThreshold: 1,
              categoryIds: ['management', 'observability', 'securitySolution'],
            },
            spaceIds: ['default', 'space-1'],
          },
          traceparent: '',
          enabled: true,
          attempts: 1,
          scheduledAt: new Date('2025-06-10T23:21:22.630Z'),
          startedAt: new Date('2025-06-10T23:21:24.083Z'),
          retryAt: new Date('2025-06-10T23:26:54.083Z'),
          runAt: new Date('2025-06-10T23:21:22.630Z'),
          status: TaskStatus.Running,
          partition: 232,
          ownerId: 'kibana:5b2de169-2785-441b-ae8c-186a1936b17d',
          id: 'Alerting-alert-deletion-493c3342-304f-43eb-9770-db79c84e8162',
        },
      ],
      versionMap: new Map(),
    });

    const response = await alertDeletionClient.scheduleTask(
      fakeRequest,
      {
        isActiveAlertDeleteEnabled: false,
        isInactiveAlertDeleteEnabled: true,
        activeAlertDeleteThreshold: 1,
        inactiveAlertDeleteThreshold: 30,
        categoryIds: ['observability', 'management', 'securitySolution'],
      },
      ['default']
    );
    expect(response).toEqual(`Alert deletion task is already running for this space.`);
    expect(taskManagerStart.schedule).not.toHaveBeenCalled();
    expect(auditLog.log).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Found alert deletion tasks running for space IDs: default, space-1'
    );
  });

  test('should log and re-throw error if error scheduling task', async () => {
    const auditLog = auditService.withoutRequest;
    auditService.asScoped = jest.fn(() => auditLog);
    taskManagerStart.schedule.mockRejectedValueOnce(new Error('Failed to schedule task'));
    taskManagerStart.fetch.mockResolvedValueOnce({
      docs: [],
      versionMap: new Map(),
    });
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
