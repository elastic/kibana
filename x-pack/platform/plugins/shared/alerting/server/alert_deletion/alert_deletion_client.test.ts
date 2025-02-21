/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { AlertDeletionClient } from './alert_deletion_client';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { elasticsearchServiceMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { RULES_SETTINGS_SAVED_OBJECT_TYPE, RulesSettingsAlertDeletionProperties } from '../types';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS } from '@kbn/rule-data-utils';

const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const eventLogger = eventLoggerMock.create();
const getAlertIndicesAliasMock = jest.fn();
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
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
                      should: [{ match_phrase: { 'event.kind': 'close' } }],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ range: { '@timestamp': { lt: `now-${days}d` } } }],
                    },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ match_phrase: { 'kibana.alert.workflow_status': 'closed' } }],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          range: {
                            'kibana.alert.workflow_status_updated_at': { lt: `now-${days}d` },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ match_phrase: { 'kibana.alert.status': 'untracked' } }],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [{ range: { 'kibana.alert.end': { lt: `now-${days}d` } } }],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [{ match: { 'kibana.space_ids': spaceId } }],
        },
      },
    ],
  },
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
                should: [{ match_phrase: { 'event.kind': 'open' } }],
              },
            },
            {
              bool: {
                minimum_should_match: 1,
                should: [{ match_phrase: { 'event.kind': 'active' } }],
              },
            },
          ],
        },
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [{ range: { 'kibana.alert.start': { lt: `now-${days}d` } } }],
        },
      },
      {
        bool: {
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [{ exists: { field: 'kibana.alert.end' } }],
            },
          },
        },
      },
      {
        bool: {
          minimum_should_match: 1,
          should: [{ match: { 'kibana.space_ids': spaceId } }],
        },
      },
    ],
  },
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
  params: { spaceIds: ['default', 'space-1', 'another-space'] },
  ownerId: null,
};

const mockCreatePointInTimeFinderAsInternalUser = (
  response: {
    saved_objects: Array<{
      id: string;
      type: string;
      attributes: RulesSettingsAlertDeletionProperties;
      references?: Array<{ id: string; name: string; type: string }>;
      namespaces?: string[];
    }>;
  } = {
    saved_objects: [
      {
        id: 'alert-deletion-settings',
        type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
        attributes: {
          isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 30,
        },
        references: [],
      },
      {
        id: 'space-1:alert-deletion-settings',
        type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
        attributes: {
          isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 30,
        },
        references: [],
        namespaces: ['space-1'],
      },
      {
        id: 'another-space:alert-deletion-settings',
        type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
        attributes: {
          isActiveAlertsDeletionEnabled: true,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 90,
          inactiveAlertsDeletionThreshold: 30,
        },
        references: [],
        namespaces: ['another-space'],
      },
    ],
  }
) => {
  internalSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockResolvedValue({
    close: jest.fn(),
    find: function* asyncGenerator() {
      yield response;
    },
  });
};

describe('AlertDeletionClient', () => {
  let alertDeletionClient: AlertDeletionClient;

  beforeEach(() => {
    jest.resetAllMocks();
    logger.get.mockImplementation(() => logger);
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
      taskManagerStart.ensureScheduled.mockRejectedValueOnce(new Error('Failed to schedule task'));
      await expect(
        alertDeletionClient.scheduleTask(['space-1'])
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failed to schedule task"`);
      expect(logger.error).toHaveBeenCalledWith(
        'Error scheduling alert deletion task: Failed to schedule task'
      );
    });
  });

  describe('previewTask', () => {
    test('should return count of inactive alerts', async () => {
      esClient.count.mockResolvedValue({
        count: 1,
        _shards: { failed: 0, successful: 0, total: 0 },
      });
      const result = await alertDeletionClient.previewTask(
        {
          isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 30,
        },
        'space-1'
      );

      expect(esClient.count).toHaveBeenCalledTimes(1);
      expect(esClient.count).toHaveBeenCalledWith({
        index: ['index1', 'index2'],
        query: inactiveAlertsQuery(),
      });

      expect(result).toEqual(1);
    });

    test('should return count of active alerts', async () => {
      esClient.count.mockResolvedValue({
        count: 3,
        _shards: { failed: 0, successful: 0, total: 0 },
      });
      const result = await alertDeletionClient.previewTask(
        {
          isActiveAlertsDeletionEnabled: true,
          isInactiveAlertsDeletionEnabled: false,
          activeAlertsDeletionThreshold: 45,
          inactiveAlertsDeletionThreshold: 1,
        },
        'space-1'
      );

      expect(esClient.count).toHaveBeenCalledTimes(1);
      expect(esClient.count).toHaveBeenCalledWith({
        index: ['index1', 'index2'],
        query: activeAlertsQuery(),
      });

      expect(result).toEqual(3);
    });

    test('should return count of active and inactive alerts', async () => {
      esClient.count.mockResolvedValueOnce({
        count: 8,
        _shards: { failed: 0, successful: 0, total: 0 },
      });
      esClient.count.mockResolvedValueOnce({
        count: 1,
        _shards: { failed: 0, successful: 0, total: 0 },
      });
      const result = await alertDeletionClient.previewTask(
        {
          isActiveAlertsDeletionEnabled: true,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 45,
          inactiveAlertsDeletionThreshold: 30,
        },
        'space-1'
      );

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

    test('should throw error if count query throws error', async () => {
      esClient.count.mockRejectedValue(new Error('Fail to count alerts'));
      await expect(
        alertDeletionClient.previewTask(
          {
            isActiveAlertsDeletionEnabled: false,
            isInactiveAlertsDeletionEnabled: true,
            activeAlertsDeletionThreshold: 1,
            inactiveAlertsDeletionThreshold: 30,
          },
          'space-1'
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail to count alerts"`);

      expect(esClient.count).toHaveBeenCalledTimes(1);
      expect(esClient.count).toHaveBeenCalledWith({
        index: ['index1', 'index2'],
        query: inactiveAlertsQuery(),
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error determining the number of inactive alerts to delete: Fail to count alerts'
      );
    });
  });

  describe('runTask', () => {
    test('should look up rules settings and issue queries for each space setting', async () => {
      mockCreatePointInTimeFinderAsInternalUser();
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 2 },
          hits: [
            {
              _id: 'abc',
              _index: '.internal.alerts-test.alerts-default-000001',
              _seq_no: 41,
              _primary_term: 665,
              _source: {
                [ALERT_INSTANCE_ID]: 'query matched',
                [ALERT_RULE_UUID]: '1',
                [SPACE_IDS]: ['another-space'],
              },
            },
            {
              _id: 'def',
              _index: '.internal.alerts-test.alerts-default-000001',
              _seq_no: 5,
              _primary_term: 545,
              _source: {
                [ALERT_INSTANCE_ID]: 'threshold exceeded',
                [ALERT_RULE_UUID]: '3',
                [SPACE_IDS]: ['another-space'],
              },
            },
          ],
        },
      });
      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 10,
        items: [
          {
            delete: {
              _index: '.internal.alerts-test.alerts-default-000001',
              _id: 'abc',
              result: 'deleted',
              status: 200,
            },
          },
          {
            delete: {
              _index: '.internal.alerts-test.alerts-default-000001',
              _id: 'def',
              result: 'deleted',
              status: 200,
            },
          },
        ],
      });
      esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 3 });
      esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 10 });
      esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 123 });
      getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2']);
      getAlertIndicesAliasMock.mockReturnValueOnce(['alert-index-1']);
      getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2', 'alert-index-3']);

      // @ts-ignore - accessing private function for testing
      await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

      // 3 settings with isInactiveAlertsDeletionEnabled = true, should be 3 delete by queries
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(3);
      expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
        1,
        {
          index: ['index1', 'index2'],
          query: inactiveAlertsQuery(30, 'default'),
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
        2,
        {
          index: ['alert-index-1'],
          query: inactiveAlertsQuery(30, 'space-1'),
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
        3,
        {
          index: ['index1', 'index2', 'alert-index-3'],
          query: inactiveAlertsQuery(30, 'another-space'),
        },
        { signal: expect.any(AbortSignal) }
      );

      // 1 setting with isActiveAlertsDeletionEnabled = true
      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith(
        {
          index: ['index1', 'index2', 'alert-index-3'],
          query: activeAlertsQuery(90, 'another-space'),
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      expect(esClient.bulk).toHaveBeenCalledWith(
        {
          operations: [
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'abc' } },
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'def' } },
          ],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledWith(
        ['task:1', 'task:3'],
        expect.any(Function)
      );

      expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
        '@timestamp': expect.any(String),
        event: {
          action: 'delete-alerts',
          outcome: 'success',
          start: expect.any(String),
          end: expect.any(String),
          duration: expect.any(String),
        },
        message: 'Alert deletion task deleted 3 alerts',
        kibana: { space_ids: ['default'] },
      });
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
        '@timestamp': expect.any(String),
        event: {
          action: 'delete-alerts',
          outcome: 'success',
          start: expect.any(String),
          end: expect.any(String),
          duration: expect.any(String),
        },
        message: 'Alert deletion task deleted 10 alerts',
        kibana: { space_ids: ['space-1'] },
      });
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
        '@timestamp': expect.any(String),
        event: {
          action: 'delete-alerts',
          outcome: 'success',
          start: expect.any(String),
          end: expect.any(String),
          duration: expect.any(String),
        },
        message: 'Alert deletion task deleted 125 alerts',
        kibana: { space_ids: ['another-space'] },
      });
    });

    describe('error handling', () => {
      test('should handle errors querying for rule settings saved objects', async () => {
        internalSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockResolvedValue({
          close: jest.fn(),
          find: function* asyncGenerator() {
            throw new Error('error getting saved object');
          },
        });

        // @ts-ignore - accessing private function for testing
        await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
        expect(esClient.search).not.toHaveBeenCalled();
        expect(esClient.bulk).not.toHaveBeenCalled();
        expect(taskManagerStart.bulkUpdateState).not.toHaveBeenCalled();
        expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'failure',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          error: { message: `error getting saved object` },
          kibana: { space_ids: ['default', 'space-1', 'another-space'] },
        });
      });

      test('should handle errors querying for active alerts to delete', async () => {
        mockCreatePointInTimeFinderAsInternalUser();
        esClient.search.mockImplementation(() => {
          throw new Error('search failure!');
        });
        esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 3 });
        esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 10 });
        esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 123 });
        getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2']);
        getAlertIndicesAliasMock.mockReturnValueOnce(['alert-index-1']);
        getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2', 'alert-index-3']);

        // @ts-ignore - accessing private function for testing
        await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

        // active alerts search failures should not prevent inactive alerts from being deleted
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(3);
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          1,
          {
            index: ['index1', 'index2'],
            query: inactiveAlertsQuery(30, 'default'),
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          2,
          {
            index: ['alert-index-1'],
            query: inactiveAlertsQuery(30, 'space-1'),
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          3,
          {
            index: ['index1', 'index2', 'alert-index-3'],
            query: inactiveAlertsQuery(30, 'another-space'),
          },
          { signal: expect.any(AbortSignal) }
        );

        // 1 setting with isActiveAlertsDeletionEnabled = true
        expect(esClient.search).toHaveBeenCalledTimes(1);
        expect(esClient.search).toHaveBeenCalledWith(
          {
            index: ['index1', 'index2', 'alert-index-3'],
            query: activeAlertsQuery(90, 'another-space'),
            _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID],
          },
          { signal: expect.any(AbortSignal) }
        );

        // search failed so no subsequent operations for active alerts deletion
        expect(esClient.bulk).not.toHaveBeenCalled();
        expect(taskManagerStart.bulkUpdateState).not.toHaveBeenCalled();

        expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'success',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          message: 'Alert deletion task deleted 3 alerts',
          kibana: { space_ids: ['default'] },
        });
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'success',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          message: 'Alert deletion task deleted 10 alerts',
          kibana: { space_ids: ['space-1'] },
        });
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'failure',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          error: { message: 'Error deleting active alerts: search failure!' },
          kibana: { space_ids: ['another-space'] },
        });
      });

      test('should handle errors bulk deleting active alerts', async () => {
        mockCreatePointInTimeFinderAsInternalUser();
        esClient.search.mockResolvedValueOnce({
          took: 10,
          timed_out: false,
          _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
          hits: {
            total: { relation: 'eq', value: 2 },
            hits: [
              {
                _id: 'abc',
                _index: '.internal.alerts-test.alerts-default-000001',
                _seq_no: 41,
                _primary_term: 665,
                _source: {
                  [ALERT_INSTANCE_ID]: 'query matched',
                  [ALERT_RULE_UUID]: '1',
                  [SPACE_IDS]: ['another-space'],
                },
              },
              {
                _id: 'def',
                _index: '.internal.alerts-test.alerts-default-000001',
                _seq_no: 5,
                _primary_term: 545,
                _source: {
                  [ALERT_INSTANCE_ID]: 'threshold exceeded',
                  [ALERT_RULE_UUID]: '3',
                  [SPACE_IDS]: ['another-space'],
                },
              },
            ],
          },
        });
        esClient.bulk.mockResolvedValueOnce({
          errors: true,
          took: 10,
          items: [
            {
              delete: {
                _index: '.internal.alerts-test.alerts-default-000001',
                _id: 'abc',
                result: 'deleted',
                status: 200,
              },
            },
            {
              delete: {
                _index: '.internal.alerts-test.alerts-default-000001',
                _id: 'def',
                result: 'not_found',
                status: 404,
                error: {
                  type: 'document_missing_exception',
                  reason: 'not found',
                },
              },
            },
          ],
        });
        esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 3 });
        esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 10 });
        esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 123 });
        getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2']);
        getAlertIndicesAliasMock.mockReturnValueOnce(['alert-index-1']);
        getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2', 'alert-index-3']);

        // @ts-ignore - accessing private function for testing
        await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

        // active alerts search failures should not prevent inactive alerts from being deleted
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(3);
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          1,
          {
            index: ['index1', 'index2'],
            query: inactiveAlertsQuery(30, 'default'),
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          2,
          {
            index: ['alert-index-1'],
            query: inactiveAlertsQuery(30, 'space-1'),
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          3,
          {
            index: ['index1', 'index2', 'alert-index-3'],
            query: inactiveAlertsQuery(30, 'another-space'),
          },
          { signal: expect.any(AbortSignal) }
        );

        // 1 setting with isActiveAlertsDeletionEnabled = true
        expect(esClient.search).toHaveBeenCalledTimes(1);
        expect(esClient.search).toHaveBeenCalledWith(
          {
            index: ['index1', 'index2', 'alert-index-3'],
            query: activeAlertsQuery(90, 'another-space'),
            _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID],
          },
          { signal: expect.any(AbortSignal) }
        );

        expect(esClient.bulk).toHaveBeenCalledTimes(1);
        expect(esClient.bulk).toHaveBeenCalledWith(
          {
            operations: [
              { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'abc' } },
              { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'def' } },
            ],
          },
          { signal: expect.any(AbortSignal) }
        );

        // only 1 task state updated
        expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledWith(
          ['task:1'],
          expect.any(Function)
        );

        expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'success',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          message: 'Alert deletion task deleted 3 alerts',
          kibana: { space_ids: ['default'] },
        });
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'success',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          message: 'Alert deletion task deleted 10 alerts',
          kibana: { space_ids: ['space-1'] },
        });
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'failure',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          error: { message: `Error deleting alert "def" - not found` },
          kibana: { space_ids: ['another-space'] },
        });
      });

      test('should handle errors deleting inactive alerts by query', async () => {
        mockCreatePointInTimeFinderAsInternalUser();
        esClient.search.mockResolvedValueOnce({
          took: 10,
          timed_out: false,
          _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
          hits: {
            total: { relation: 'eq', value: 2 },
            hits: [
              {
                _id: 'abc',
                _index: '.internal.alerts-test.alerts-default-000001',
                _seq_no: 41,
                _primary_term: 665,
                _source: {
                  [ALERT_INSTANCE_ID]: 'query matched',
                  [ALERT_RULE_UUID]: '1',
                  [SPACE_IDS]: ['another-space'],
                },
              },
              {
                _id: 'def',
                _index: '.internal.alerts-test.alerts-default-000001',
                _seq_no: 5,
                _primary_term: 545,
                _source: {
                  [ALERT_INSTANCE_ID]: 'threshold exceeded',
                  [ALERT_RULE_UUID]: '3',
                  [SPACE_IDS]: ['another-space'],
                },
              },
            ],
          },
        });
        esClient.bulk.mockResolvedValueOnce({
          errors: false,
          took: 10,
          items: [
            {
              delete: {
                _index: '.internal.alerts-test.alerts-default-000001',
                _id: 'abc',
                result: 'deleted',
                status: 200,
              },
            },
            {
              delete: {
                _index: '.internal.alerts-test.alerts-default-000001',
                _id: 'def',
                result: 'deleted',
                status: 200,
              },
            },
          ],
        });
        esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 3 });
        esClient.deleteByQuery.mockRejectedValueOnce(new Error('delete by query failure'));
        esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 123 });
        getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2']);
        getAlertIndicesAliasMock.mockReturnValueOnce(['alert-index-1']);
        getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2', 'alert-index-3']);

        // @ts-ignore - accessing private function for testing
        await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

        // 3 settings with isInactiveAlertsDeletionEnabled = true, should be 3 delete by queries
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(3);
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          1,
          {
            index: ['index1', 'index2'],
            query: inactiveAlertsQuery(30, 'default'),
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          2,
          {
            index: ['alert-index-1'],
            query: inactiveAlertsQuery(30, 'space-1'),
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(
          3,
          {
            index: ['index1', 'index2', 'alert-index-3'],
            query: inactiveAlertsQuery(30, 'another-space'),
          },
          { signal: expect.any(AbortSignal) }
        );

        // 1 setting with isActiveAlertsDeletionEnabled = true
        expect(esClient.search).toHaveBeenCalledTimes(1);
        expect(esClient.search).toHaveBeenCalledWith(
          {
            index: ['index1', 'index2', 'alert-index-3'],
            query: activeAlertsQuery(90, 'another-space'),
            _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID],
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(esClient.bulk).toHaveBeenCalledTimes(1);
        expect(esClient.bulk).toHaveBeenCalledWith(
          {
            operations: [
              { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'abc' } },
              { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'def' } },
            ],
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledWith(
          ['task:1', 'task:3'],
          expect.any(Function)
        );

        expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'success',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          message: 'Alert deletion task deleted 3 alerts',
          kibana: { space_ids: ['default'] },
        });
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'failure',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          error: { message: `Error deleting inactive alerts: delete by query failure` },
          kibana: { space_ids: ['space-1'] },
        });
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
          '@timestamp': expect.any(String),
          event: {
            action: 'delete-alerts',
            outcome: 'success',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          message: 'Alert deletion task deleted 125 alerts',
          kibana: { space_ids: ['another-space'] },
        });
      });
    });
  });
});
