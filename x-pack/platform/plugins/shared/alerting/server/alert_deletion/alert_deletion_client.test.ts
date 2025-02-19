/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { taskManagerMock } from "@kbn/task-manager-plugin/server/mocks";
import { AlertDeletionClient } from "./alert_deletion_client";
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { elasticsearchServiceMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';

const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const eventLogger = eventLoggerMock.create();
const getAlertIndicesAliasMock = jest.fn();
const logger = loggingSystemMock.create().get();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const spacesStart = spacesMock.createStart();
const taskManagerSetup = taskManagerMock.createSetup();
const taskManagerStart = taskManagerMock.createStart();

describe('AlertDeletionClient', () => {
  let alertDeletionClient: AlertDeletionClient;

  beforeEach(() => {
    jest.resetAllMocks();
    alertDeletionClient = new AlertDeletionClient({
      elasticsearchClientPromise: Promise.resolve(clusterClient),
      eventLogger,
      getAlertIndicesAlias: getAlertIndicesAliasMock,
      internalSavedObjectsRepositoryPromise: Promise.resolve(internalSavedObjectsRepository),
      logger,
      ruleTypeRegistry,
      spacesStartPromise: Promise.resolve(spacesStart),
      taskManagerSetup,
      taskManagerStartPromise: Promise.resolve(taskManagerStart),
    });
  });

  describe('constructor', () => {
    test('should register alert deletion task type', async () => {
      expect(taskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith({
        'alert-deletion': {
          title: 'Alert deletion task',
          maxAttempts: 1,
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });

  describe('scheduleTask', () => {
    test('should schedule ad hoc task with given space ID', async () => {
      await alertDeletionClient.scheduleTask(['space-1', 'default']);
      expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith({
        id: `Alerting-alert-deletion`,
        taskType: 'alert-deletion',
        params: { spaceIds: ['space-1', 'default'] },
        state: {},
        scope: ['alerting'],
      });
    });

    test('should log and re-throw error if error scheduling task', async () => {
      taskManagerStart.ensureScheduled.mockRejectedValue(new Error('Fail to schedule task'));
      await expect(alertDeletionClient.scheduleTask(['space-1'])).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail to schedule task"`);
      expect(logger.error).toHaveBeenCalledWith('Error scheduling alert deletion task: Fail to schedule task');
    });
  });

  describe('previewTask', () => {
  });

  describe('runTask', () => {
  });
});
