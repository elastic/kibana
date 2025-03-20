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
import { RULES_SETTINGS_SAVED_OBJECT_TYPE } from '../types';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS, TIMESTAMP } from '@kbn/rule-data-utils';
import type { AuditLogger } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

const auditLogger: AuditLogger = {
  enabled: true,
  log: jest.fn(),
  includeSavedObjectNames: false,
};

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
    should: [
      {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      should: [{ match_phrase: { 'kibana.alert.workflow_status': 'closed' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        { match_phrase: { 'kibana.alert.workflow_status': 'acknowledged' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  { range: { 'kibana.alert.workflow_status_updated_at': { lt: `now-${days}d` } } },
                ],
                minimum_should_match: 1,
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
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          bool: {
                            should: [{ match_phrase: { 'kibana.alert.status': 'untracked' } }],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [{ match_phrase: { 'kibana.alert.status': 'recovered' } }],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ range: { 'kibana.alert.end': { lt: `now-${days}d` } } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
            {
              bool: {
                should: [{ match: { 'kibana.space_ids': spaceId } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

const activeAlertsQuery = (days: number = 45, spaceId: string = 'space-1') => ({
  bool: {
    filter: [
      {
        bool: {
          minimum_should_match: 1,
          should: [{ match_phrase: { 'kibana.alert.status': 'active' } }],
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
          must_not: {
            bool: {
              minimum_should_match: 1,
              should: [{ exists: { field: 'kibana.alert.workflow_status_updated_at' } }],
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

interface Opts {
  id: string;
  ruleId?: string;
  searchAfter?: SortResults;
}

const getMockAlert = ({ id, ruleId, searchAfter }: Opts) => ({
  _id: id,
  _index: '.internal.alerts-test.alerts-default-000001',
  _seq_no: 41,
  _primary_term: 665,
  ...(searchAfter ? { sort: searchAfter } : {}),
  _source: {
    [ALERT_INSTANCE_ID]: 'query matched',
    [ALERT_RULE_UUID]: ruleId ?? '1',
    [SPACE_IDS]: ['another-space'],
  },
});

const getDeletedResponse = (id: string) => ({
  delete: {
    _index: '.internal.alerts-test.alerts-default-000001',
    _id: id,
    result: 'deleted',
    status: 200,
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

describe('AlertDeletionClient', () => {
  let alertDeletionClient: AlertDeletionClient;

  beforeEach(() => {
    jest.resetAllMocks();
    logger.get.mockImplementation(() => logger);
    getAlertIndicesAliasMock.mockReturnValue(['index1', 'index2']);
    alertDeletionClient = new AlertDeletionClient({
      auditLogger,
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
    internalSavedObjectsRepository.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'alert-deletion-settings',
          type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
          attributes: {
            alertDeletion: {
              isActiveAlertsDeletionEnabled: false,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 1,
              inactiveAlertsDeletionThreshold: 30,
            },
          },
          references: [],
        },
        {
          id: 'space-1:alert-deletion-settings',
          type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
          attributes: {
            alertDeletion: {
              isActiveAlertsDeletionEnabled: false,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 1,
              inactiveAlertsDeletionThreshold: 30,
              categoryIds: ['securitySolution'],
            },
          },
          references: [],
          namespaces: ['space-1'],
        },
        {
          id: 'another-space:alert-deletion-settings',
          type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
          attributes: {
            alertDeletion: {
              isActiveAlertsDeletionEnabled: true,
              isInactiveAlertsDeletionEnabled: true,
              activeAlertsDeletionThreshold: 90,
              inactiveAlertsDeletionThreshold: 30,
            },
          },
          references: [],
          namespaces: ['another-space'],
        },
      ],
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

      expect(ruleTypeRegistry.getAllTypes).toHaveBeenCalled();
      expect(ruleTypeRegistry.getAllTypesForCategories).not.toHaveBeenCalled();
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

      expect(ruleTypeRegistry.getAllTypes).toHaveBeenCalled();
      expect(ruleTypeRegistry.getAllTypesForCategories).not.toHaveBeenCalled();
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

    test('should use category IDs if specified', async () => {
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
          categoryIds: ['observability'],
        },
        'space-1'
      );

      expect(ruleTypeRegistry.getAllTypes).not.toHaveBeenCalled();
      expect(ruleTypeRegistry.getAllTypesForCategories).toHaveBeenCalledWith(['observability']);
      expect(esClient.count).toHaveBeenCalledTimes(1);
      expect(esClient.count).toHaveBeenCalledWith({
        index: ['index1', 'index2'],
        query: inactiveAlertsQuery(),
      });

      expect(result).toEqual(1);
    });

    test('should throw error for invalid category IDs', async () => {
      await expect(
        alertDeletionClient.previewTask(
          {
            isActiveAlertsDeletionEnabled: false,
            isInactiveAlertsDeletionEnabled: true,
            activeAlertsDeletionThreshold: 1,
            inactiveAlertsDeletionThreshold: 30,
            categoryIds: ['invalid-category', 'management'],
          },
          'space-1'
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Invalid category id - invalid-category,management"`
      );
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
      // search for setting 1, inactive alert > 30 days
      esClient.openPointInTime.mockResolvedValueOnce({
        id: 'pit1',
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      });
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 2 },
          hits: [getMockAlert({ id: 'abc' }), getMockAlert({ id: 'def' })],
        },
      });
      esClient.openPointInTime.mockResolvedValueOnce({
        id: 'pit2',
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      });
      // search for setting 2, inactive alert > 30 days
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 2 },
          hits: [getMockAlert({ id: 'xyz' }), getMockAlert({ id: 'rst' })],
        },
      });
      esClient.openPointInTime.mockResolvedValueOnce({
        id: 'pit3',
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      });
      // search for setting 3, active alert > 90 days
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 2 },
          hits: [
            getMockAlert({ id: 'mno', ruleId: '1' }),
            getMockAlert({ id: 'pqr', ruleId: '3' }),
          ],
        },
      });
      esClient.openPointInTime.mockResolvedValueOnce({
        id: 'pit4',
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      });
      // search for setting 3, inactive alert > 30 days
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 2 },
          hits: [getMockAlert({ id: 'ghi' }), getMockAlert({ id: 'jkl' })],
        },
      });
      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 10,
        items: [getDeletedResponse('abc'), getDeletedResponse('def')],
      });
      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 10,
        items: [getDeletedResponse('xyz'), getDeletedResponse('rst')],
      });
      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 10,
        items: [getDeletedResponse('mno'), getDeletedResponse('pqr')],
      });
      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 10,
        items: [getDeletedResponse('ghi'), getDeletedResponse('jkl')],
      });

      getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2']);
      getAlertIndicesAliasMock.mockReturnValueOnce(['alert-index-1']);
      getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2', 'alert-index-3']);

      // @ts-ignore - accessing private function for testing
      await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

      expect(ruleTypeRegistry.getAllTypes).toHaveBeenCalledTimes(2);
      expect(ruleTypeRegistry.getAllTypesForCategories).toHaveBeenCalledTimes(1);
      expect(ruleTypeRegistry.getAllTypesForCategories).toHaveBeenCalledWith(['securitySolution']);

      // 3 inactive alert queries, 1 active alert query
      expect(esClient.openPointInTime).toHaveBeenCalledTimes(4);
      expect(esClient.openPointInTime).toHaveBeenNthCalledWith(1, {
        keep_alive: '1m',
        index: ['index1', 'index2'],
      });
      expect(esClient.openPointInTime).toHaveBeenNthCalledWith(2, {
        keep_alive: '1m',
        index: ['alert-index-1'],
      });
      expect(esClient.openPointInTime).toHaveBeenNthCalledWith(3, {
        keep_alive: '1m',
        index: ['index1', 'index2', 'alert-index-3'],
      });
      expect(esClient.openPointInTime).toHaveBeenNthCalledWith(4, {
        keep_alive: '1m',
        index: ['index1', 'index2', 'alert-index-3'],
      });

      expect(esClient.search).toHaveBeenCalledTimes(4);
      expect(esClient.search).toHaveBeenNthCalledWith(
        1,
        {
          query: inactiveAlertsQuery(30, 'default'),
          size: 1000,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: 'pit1', keep_alive: '1m' },
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.search).toHaveBeenNthCalledWith(
        2,
        {
          query: inactiveAlertsQuery(30, 'space-1'),
          size: 1000,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: 'pit2', keep_alive: '1m' },
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.search).toHaveBeenNthCalledWith(
        3,
        {
          query: activeAlertsQuery(90, 'another-space'),
          size: 1000,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: 'pit3', keep_alive: '1m' },
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.search).toHaveBeenNthCalledWith(
        4,
        {
          query: inactiveAlertsQuery(30, 'another-space'),
          size: 1000,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: 'pit4', keep_alive: '1m' },
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
        },
        { signal: expect.any(AbortSignal) }
      );

      // bulk delete based on search results
      expect(esClient.bulk).toHaveBeenCalledTimes(4);
      expect(esClient.bulk).toHaveBeenNthCalledWith(
        1,
        {
          operations: [
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'abc' } },
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'def' } },
          ],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.bulk).toHaveBeenNthCalledWith(
        2,
        {
          operations: [
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'xyz' } },
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'rst' } },
          ],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.bulk).toHaveBeenNthCalledWith(
        3,
        {
          operations: [
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'mno' } },
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'pqr' } },
          ],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.bulk).toHaveBeenNthCalledWith(
        4,
        {
          operations: [
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'ghi' } },
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'jkl' } },
          ],
        },
        { signal: expect.any(AbortSignal) }
      );

      expect(auditLogger.log).toHaveBeenCalledTimes(8);
      ['abc', 'def', 'xyz', 'rst', 'mno', 'pqr', 'ghi', 'jkl'].forEach((id) => {
        expect(auditLogger.log).toHaveBeenCalledWith({
          message: `System has deleted alert [id=${id}]`,
          event: {
            action: 'alert_delete',
            category: ['database'],
            outcome: 'success',
            type: ['deletion'],
          },
        });
      });

      expect(esClient.closePointInTime).toHaveBeenCalledTimes(4);

      // bulk task state update for active alert setting
      expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledTimes(1);
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
        message: 'Alert deletion task deleted 2 alerts',
        kibana: {
          alert: { deletion: { num_deleted: 2 } },
          space_ids: ['default'],
        },
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
        message: 'Alert deletion task deleted 2 alerts',
        kibana: { alert: { deletion: { num_deleted: 2 } }, space_ids: ['space-1'] },
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
        message: 'Alert deletion task deleted 4 alerts',
        kibana: {
          alert: { deletion: { num_deleted: 4 } },
          space_ids: ['another-space'],
        },
      });
    });

    test('should use search_after to paginate query', async () => {
      internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'alert-deletion-settings',
            type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
            attributes: {
              alertDeletion: {
                isActiveAlertsDeletionEnabled: false,
                isInactiveAlertsDeletionEnabled: true,
                activeAlertsDeletionThreshold: 1,
                inactiveAlertsDeletionThreshold: 30,
              },
            },
            references: [],
          },
        ],
      });
      esClient.openPointInTime.mockResolvedValueOnce({
        id: 'pit1',
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      });
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 2 },
          hits: [
            getMockAlert({ id: 'abc', searchAfter: ['111'] }),
            getMockAlert({ id: 'def', searchAfter: ['222'] }),
          ],
        },
      });
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 2 },
          hits: [
            getMockAlert({ id: 'ghi', searchAfter: ['333'] }),
            getMockAlert({ id: 'jkl', searchAfter: ['444'] }),
          ],
        },
      });
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 2 },
          hits: [getMockAlert({ id: 'mno', searchAfter: ['555'] })],
        },
      });
      esClient.search.mockResolvedValueOnce({
        took: 10,
        timed_out: false,
        _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        hits: {
          total: { relation: 'eq', value: 0 },
          hits: [],
        },
      });

      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 10,
        items: [getDeletedResponse('abc'), getDeletedResponse('def')],
      });
      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 10,
        items: [getDeletedResponse('ghi'), getDeletedResponse('jkl')],
      });
      esClient.bulk.mockResolvedValueOnce({
        errors: false,
        took: 10,
        items: [getDeletedResponse('mno')],
      });

      getAlertIndicesAliasMock.mockReturnValueOnce(['alert-index-1']);

      // @ts-ignore - accessing private function for testing
      await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

      expect(ruleTypeRegistry.getAllTypes).toHaveBeenCalledTimes(1);

      expect(esClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(esClient.openPointInTime).toHaveBeenNthCalledWith(1, {
        keep_alive: '1m',
        index: ['alert-index-1'],
      });

      expect(esClient.search).toHaveBeenCalledTimes(4);
      expect(esClient.search).toHaveBeenNthCalledWith(
        1,
        {
          query: inactiveAlertsQuery(30, 'default'),
          size: 1000,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: 'pit1', keep_alive: '1m' },
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.search).toHaveBeenNthCalledWith(
        2,
        {
          query: inactiveAlertsQuery(30, 'default'),
          size: 1000,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: 'pit1', keep_alive: '1m' },
          search_after: ['222'],
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.search).toHaveBeenNthCalledWith(
        3,
        {
          query: inactiveAlertsQuery(30, 'default'),
          size: 1000,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: 'pit1', keep_alive: '1m' },
          search_after: ['444'],
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.search).toHaveBeenNthCalledWith(
        4,
        {
          query: inactiveAlertsQuery(30, 'default'),
          size: 1000,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: 'pit1', keep_alive: '1m' },
          search_after: ['555'],
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
        },
        { signal: expect.any(AbortSignal) }
      );

      // bulk delete based on search results
      expect(esClient.bulk).toHaveBeenCalledTimes(3);
      expect(esClient.bulk).toHaveBeenNthCalledWith(
        1,
        {
          operations: [
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'abc' } },
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'def' } },
          ],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.bulk).toHaveBeenNthCalledWith(
        2,
        {
          operations: [
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'ghi' } },
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'jkl' } },
          ],
        },
        { signal: expect.any(AbortSignal) }
      );
      expect(esClient.bulk).toHaveBeenNthCalledWith(
        3,
        {
          operations: [
            { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'mno' } },
          ],
        },
        { signal: expect.any(AbortSignal) }
      );

      expect(auditLogger.log).toHaveBeenCalledTimes(5);
      ['abc', 'def', 'ghi', 'jkl', 'mno'].forEach((id) => {
        expect(auditLogger.log).toHaveBeenCalledWith({
          message: `System has deleted alert [id=${id}]`,
          event: {
            action: 'alert_delete',
            category: ['database'],
            outcome: 'success',
            type: ['deletion'],
          },
        });
      });

      expect(esClient.closePointInTime).toHaveBeenCalledTimes(1);

      expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
        '@timestamp': expect.any(String),
        event: {
          action: 'delete-alerts',
          outcome: 'success',
          start: expect.any(String),
          end: expect.any(String),
          duration: expect.any(String),
        },
        message: 'Alert deletion task deleted 5 alerts',
        kibana: {
          alert: { deletion: { num_deleted: 5 } },
          space_ids: ['default'],
        },
      });
    });

    describe('error handling', () => {
      test('should handle invalid category IDs rule settings saved objects', async () => {
        internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'alert-deletion-settings',
              type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
              attributes: {
                alertDeletion: {
                  isActiveAlertsDeletionEnabled: false,
                  isInactiveAlertsDeletionEnabled: true,
                  activeAlertsDeletionThreshold: 1,
                  inactiveAlertsDeletionThreshold: 30,
                  categoryIds: ['invalid-category'],
                },
              },
              references: [],
            },
          ],
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
          error: { message: `Invalid category ID found - invalid-category - not deleting alerts` },
          kibana: {
            alert: { deletion: { num_deleted: 0 } },
            space_ids: ['default'],
          },
        });
      });

      test('should handle errors querying for rule settings saved objects', async () => {
        internalSavedObjectsRepository.bulkGet.mockImplementationOnce(() => {
          throw new Error('error getting saved object');
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
          kibana: {
            alert: { deletion: { num_deleted: 0 } },
            space_ids: ['default', 'space-1', 'another-space'],
          },
        });
      });

      test('should handle bulk errors querying for rule settings saved objects', async () => {
        internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'alert-deletion-settings',
              type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
              attributes: {
                alertDeletion: {
                  isActiveAlertsDeletionEnabled: false,
                  isInactiveAlertsDeletionEnabled: false,
                  activeAlertsDeletionThreshold: 45,
                  inactiveAlertsDeletionThreshold: 100,
                },
              },
              references: [],
            },
            {
              id: 'space-1:alert-deletion-settings',
              type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
              attributes: {},
              references: [],
              namespaces: ['space-1'],
              error: {
                error:
                  'Saved object [alert-deletion-settings/space-1:alert-deletion-settings] not found',
                statusCode: 404,
                message:
                  'Saved object [alert-deletion-settings/space-1:alert-deletion-settings] not found',
              },
            },
            {
              id: 'space2:alert-deletion-settings',
              type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
              namespaces: ['space-2'],
              // malformed SO, missing attributes
              attributes: {},
              references: [],
            },
          ],
        });

        // @ts-ignore - accessing private function for testing
        await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
        expect(esClient.search).not.toHaveBeenCalled();
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
          kibana: {
            alert: { deletion: { num_deleted: 0 } },
            space_ids: ['default'],
          },
          message: 'Alert deletion task deleted 0 alerts',
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
          error: {
            message:
              'Saved object [alert-deletion-settings/space-1:alert-deletion-settings] not found',
          },
          kibana: {
            alert: { deletion: { num_deleted: 0 } },
            space_ids: ['default', 'space-1', 'another-space'],
          },
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
          error: {
            message: 'Undefined alert deletion rules settings',
          },
          kibana: {
            alert: { deletion: { num_deleted: 0 } },
            space_ids: ['space-2'],
          },
        });
      });

      test('should handle errors querying for alerts to delete', async () => {
        internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'alert-deletion-settings',
              type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
              attributes: {
                alertDeletion: {
                  isActiveAlertsDeletionEnabled: true,
                  isInactiveAlertsDeletionEnabled: true,
                  activeAlertsDeletionThreshold: 45,
                  inactiveAlertsDeletionThreshold: 100,
                },
              },
              references: [],
            },
          ],
        });
        esClient.openPointInTime.mockResolvedValueOnce({
          id: 'pit1',
          _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        });
        esClient.search.mockImplementationOnce(() => {
          throw new Error('search failure!');
        });
        esClient.openPointInTime.mockResolvedValueOnce({
          id: 'pit2',
          _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        });
        esClient.search.mockResolvedValueOnce({
          took: 10,
          timed_out: false,
          _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
          hits: {
            total: { relation: 'eq', value: 2 },
            hits: [getMockAlert({ id: 'ghi' }), getMockAlert({ id: 'jkl' })],
          },
        });
        esClient.bulk.mockResolvedValueOnce({
          errors: false,
          took: 10,
          items: [getDeletedResponse('ghi'), getDeletedResponse('jkl')],
        });

        getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2']);

        // @ts-ignore - accessing private function for testing
        await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

        // active alerts search failures should not prevent inactive alerts from being deleted

        // 1 setting with isActiveAlertsDeletionEnabled = true
        expect(esClient.search).toHaveBeenCalledTimes(2);
        expect(esClient.search).toHaveBeenNthCalledWith(
          1,
          {
            query: activeAlertsQuery(45, 'default'),
            size: 1000,
            sort: [{ [TIMESTAMP]: 'asc' }],
            pit: { id: 'pit1', keep_alive: '1m' },
            _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
          },
          { signal: expect.any(AbortSignal) }
        );
        expect(esClient.search).toHaveBeenNthCalledWith(
          2,
          {
            query: inactiveAlertsQuery(100, 'default'),
            size: 1000,
            sort: [{ [TIMESTAMP]: 'asc' }],
            pit: { id: 'pit2', keep_alive: '1m' },
            _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
          },
          { signal: expect.any(AbortSignal) }
        );

        expect(esClient.bulk).toHaveBeenCalledTimes(1);
        expect(taskManagerStart.bulkUpdateState).not.toHaveBeenCalled();
        expect(esClient.closePointInTime).toHaveBeenCalledTimes(2);

        expect(auditLogger.log).toHaveBeenCalledTimes(2);
        ['ghi', 'jkl'].forEach((id) => {
          expect(auditLogger.log).toHaveBeenCalledWith({
            message: `System has deleted alert [id=${id}]`,
            event: {
              action: 'alert_delete',
              category: ['database'],
              outcome: 'success',
              type: ['deletion'],
            },
          });
        });

        expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
          '@timestamp': expect.any(String),
          error: {
            message: 'Error deleting active alerts: search failure!',
          },
          event: {
            action: 'delete-alerts',
            outcome: 'failure',
            start: expect.any(String),
            end: expect.any(String),
            duration: expect.any(String),
          },
          kibana: { alert: { deletion: { num_deleted: 2 } }, space_ids: ['default'] },
        });
      });

      test('should handle errors bulk deleting alerts', async () => {
        internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'alert-deletion-settings',
              type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
              attributes: {
                alertDeletion: {
                  isActiveAlertsDeletionEnabled: true,
                  isInactiveAlertsDeletionEnabled: false,
                  activeAlertsDeletionThreshold: 45,
                  inactiveAlertsDeletionThreshold: 100,
                },
              },
              references: [],
            },
          ],
        });
        esClient.openPointInTime.mockResolvedValueOnce({
          id: 'pit1',
          _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
        });
        esClient.search.mockResolvedValueOnce({
          took: 10,
          timed_out: false,
          _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
          hits: {
            total: { relation: 'eq', value: 2 },
            hits: [getMockAlert({ id: 'abc' }), getMockAlert({ id: 'def', ruleId: '3' })],
          },
        });
        esClient.bulk.mockResolvedValueOnce({
          errors: true,
          took: 10,
          items: [
            getDeletedResponse('abc'),
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

        getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2', 'alert-index-3']);

        // @ts-ignore - accessing private function for testing
        await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

        expect(esClient.openPointInTime).toHaveBeenCalledTimes(1);
        expect(esClient.openPointInTime).toHaveBeenNthCalledWith(1, {
          keep_alive: '1m',
          index: ['index1', 'index2', 'alert-index-3'],
        });

        expect(esClient.search).toHaveBeenCalledTimes(1);
        expect(esClient.search).toHaveBeenCalledWith(
          {
            query: activeAlertsQuery(45, 'default'),
            size: 1000,
            sort: [{ [TIMESTAMP]: 'asc' }],
            pit: { id: 'pit1', keep_alive: '1m' },
            _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
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

        expect(auditLogger.log).toHaveBeenCalledTimes(2);
        expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
          message: `System has deleted alert [id=abc]`,
          event: {
            action: 'alert_delete',
            category: ['database'],
            outcome: 'success',
            type: ['deletion'],
          },
        });
        expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
          message: `Failed attempt to delete alert [id=def]`,
          event: {
            action: 'alert_delete',
            category: ['database'],
            outcome: 'failure',
            type: ['deletion'],
          },
          error: { code: 'Error', message: 'not found' },
        });
        // only 1 task state updated
        expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledWith(
          ['task:1'],
          expect.any(Function)
        );

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
          error: { message: `Error deleting alert "def" - not found` },
          kibana: { alert: { deletion: { num_deleted: 1 } }, space_ids: ['default'] },
        });
      });
    });
  });
});
