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
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { RULES_SETTINGS_SAVED_OBJECT_TYPE } from '../types';

const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const eventLogger = eventLoggerMock.create();
const getAlertIndicesAliasMock = jest.fn();
const logger = loggingSystemMock.create().get();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const spacesStart = spacesMock.createStart();
const taskManagerSetup = taskManagerMock.createSetup();
const taskManagerStart = taskManagerMock.createStart();

const inactiveAlertsQuery = (days: number = 30, spaceId: string = 'space-1') => ({
  bool: {
    filter: [
      {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ match_phrase: { 'event.kind': 'close' } } ]
                    }
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [ { range: { '@timestamp': {lt: `now-${days}d` } }}]
                    }
                  }
                ]
              }
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ match_phrase: { 'kibana.alert.workflow_status': 'closed' } } ]
                    }
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [ { range: { 'kibana.alert.workflow_status_updated_at': {lt: `now-${days}d` } }}]
                    }
                  }
                ]
              }
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ match_phrase: { 'kibana.alert.status': 'untracked' } } ]
                    }
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [ { range: { 'kibana.alert.end': {lt: `now-${days}d` } }}]
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [ { match: { 'kibana.space_ids': spaceId }}]
        }
      }
    ]
  }
});

const activeAlertsQuery = (days: number = 45, spaceId: string = 'space-1') => ({
  bool: {
    filter: [
      {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              bool: {
                minimum_should_match: 1,
                should: [{ match_phrase: { 'event.kind': 'open' }}]
              }
            },
            {
              bool: {
                minimum_should_match: 1,
                should: [{ match_phrase: { 'event.kind': 'active' }}]
              }
            }

          ]
        }
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [ { range: { 'kibana.alert.start': { lt: `now-${days}d`} }}]
        }
      },
      {
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [ { exists: { field: 'kibana.alert.end' }}]
            }
          }
        }
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [ { match: { 'kibana.space_ids': spaceId }}]
        }
      }
    ]
  }
});

const alertDeletionTaskInstance = {
  id: 'Alerting-alert-deletion',
  taskType: 'alert-deletion',
  scheduledAt: new Date(),
  attempts: 1,
  status: TaskStatus.Idle,
  runAt: new Date(),
  startedAt: null,
  retryAt: null,
  state: {},
  params: { spaceIds: ['default', 'space-1', 'another-space']},
  ownerId: null,
};

describe('AlertDeletionClient', () => {
  let alertDeletionClient: AlertDeletionClient;

  beforeEach(() => {
    jest.resetAllMocks();
    getAlertIndicesAliasMock.mockReturnValue(['index1', 'index2']);
    alertDeletionClient = new AlertDeletionClient({
      elasticsearchClientPromise: Promise.resolve(esClient),
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
    test('should return count of inactive alerts', async () => {
      esClient.count.mockResolvedValue({  count: 1, _shards: { failed: 0, successful: 0, total: 0}  });
      const result = await alertDeletionClient.previewTask({
        isActiveAlertsDeletionEnabled: false,
        isInactiveAlertsDeletionEnabled: true,
        activeAlertsDeletionThreshold: 1,
        inactiveAlertsDeletionThreshold: 30,
      }, 'space-1');

      expect(esClient.count).toHaveBeenCalledTimes(1);
    expect(esClient.count).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      query: inactiveAlertsQuery(),
    });

    expect(result).toEqual(1);
    });

    test('should return count of active alerts', async () => {
      esClient.count.mockResolvedValue({  count: 3, _shards: { failed: 0, successful: 0, total: 0}  });
      const result = await alertDeletionClient.previewTask({
        isActiveAlertsDeletionEnabled: true,
        isInactiveAlertsDeletionEnabled: false,
        activeAlertsDeletionThreshold: 45,
        inactiveAlertsDeletionThreshold: 1,
      }, 'space-1');

      expect(esClient.count).toHaveBeenCalledTimes(1);
    expect(esClient.count).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      query: activeAlertsQuery(),
    });

    expect(result).toEqual(3);
    });

    test('should return count of active and inactive alerts', async () => {
      esClient.count.mockResolvedValueOnce({  count: 8, _shards: { failed: 0, successful: 0, total: 0}  });
      esClient.count.mockResolvedValueOnce({  count: 1, _shards: { failed: 0, successful: 0, total: 0}  });
      const result = await alertDeletionClient.previewTask({
        isActiveAlertsDeletionEnabled: true,
        isInactiveAlertsDeletionEnabled: true,
        activeAlertsDeletionThreshold: 45,
        inactiveAlertsDeletionThreshold: 30,
      }, 'space-1');

      expect(esClient.count).toHaveBeenCalledTimes(2);
      expect(esClient.count).toHaveBeenNthCalledWith(1, {
        index: ['index1', 'index2'],
        query: activeAlertsQuery(),
      });
      expect(esClient.count).toHaveBeenNthCalledWith(2, {
        index: ['index1', 'index2'],
        query: inactiveAlertsQuery(),
      });

    expect(result).toEqual(9);
    });
  });

  describe('runTask', () => {
    test('should delete inactive alerts using delete by query', async () => {
      internalSavedObjectsRepository.find.mockResolvedValue({ saved_objects: [
        { id: 'alert-deletion-settings', type: RULES_SETTINGS_SAVED_OBJECT_TYPE, attributes: { isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 30, }, score: 0,  references: []},
        { id: 'space-1:alert-deletion-settings', type: RULES_SETTINGS_SAVED_OBJECT_TYPE,attributes: { isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 30, }, score: 0,  references: []},
          { id: 'another-space:alert-deletion-settings', type: RULES_SETTINGS_SAVED_OBJECT_TYPE,attributes: { isActiveAlertsDeletionEnabled: true,
            isInactiveAlertsDeletionEnabled: true,
            activeAlertsDeletionThreshold: 90,
            inactiveAlertsDeletionThreshold: 30, }, score: 0,  references: []},
      ] });
      esClient.deleteByQuery.mockResolvedValue({  deleted: 1  });

      // @ts-ignore - accessing private function for testing
      await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());
    });
  });
});
