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
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS, TIMESTAMP } from '@kbn/rule-data-utils';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server/spaces_service';
import { activeAlertsQuery, inactiveAlertsQuery } from './test_utils';

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
  params: {
    settings: {
      isActiveAlertDeleteEnabled: false,
      isInactiveAlertDeleteEnabled: true,
      activeAlertDeleteThreshold: 1,
      inactiveAlertDeleteThreshold: 30,
    },
    spaceIds: ['default', 'space-1', 'another-space'],
  },
  ownerId: null,
};

describe('runTask', () => {
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

  test('should use task params settings and issue queries for each space', async () => {
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
    esClient.search.mockResolvedValueOnce({
      took: 10,
      timed_out: false,
      _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      hits: {
        total: { relation: 'eq', value: 2 },
        hits: [getMockAlert({ id: 'mno', ruleId: '1' }), getMockAlert({ id: 'pqr', ruleId: '3' })],
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

    getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2']);
    getAlertIndicesAliasMock.mockReturnValueOnce(['alert-index-1']);
    getAlertIndicesAliasMock.mockReturnValueOnce(['index1', 'index2', 'alert-index-3']);

    // @ts-ignore - accessing private function for testing
    await alertDeletionClient.runTask(alertDeletionTaskInstance, new AbortController());

    expect(ruleTypeRegistry.getAllTypes).toHaveBeenCalledTimes(0);
    expect(ruleTypeRegistry.getFilteredTypes).toHaveBeenCalledTimes(3);
    expect(ruleTypeRegistry.getFilteredTypes).toHaveBeenNthCalledWith(1, {
      excludeInternallyManaged: true,
    });
    expect(ruleTypeRegistry.getFilteredTypes).toHaveBeenNthCalledWith(2, {
      excludeInternallyManaged: true,
    });
    expect(ruleTypeRegistry.getFilteredTypes).toHaveBeenNthCalledWith(3, {
      excludeInternallyManaged: true,
    });

    // 3 inactive alert queries
    expect(esClient.openPointInTime).toHaveBeenCalledTimes(3);
    expect(esClient.openPointInTime).toHaveBeenNthCalledWith(1, {
      keep_alive: '1m',
      index: ['index1', 'index2'],
      ignore_unavailable: true,
    });
    expect(esClient.openPointInTime).toHaveBeenNthCalledWith(2, {
      keep_alive: '1m',
      index: ['alert-index-1'],
      ignore_unavailable: true,
    });
    expect(esClient.openPointInTime).toHaveBeenNthCalledWith(3, {
      keep_alive: '1m',
      index: ['index1', 'index2', 'alert-index-3'],
      ignore_unavailable: true,
    });

    expect(esClient.search).toHaveBeenCalledTimes(3);
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
        query: inactiveAlertsQuery(30, 'another-space'),
        size: 1000,
        sort: [{ [TIMESTAMP]: 'asc' }],
        pit: { id: 'pit3', keep_alive: '1m' },
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

    expect(auditService.withoutRequest.log).toHaveBeenCalledTimes(6);
    ['abc', 'def', 'xyz', 'rst', 'mno', 'pqr'].forEach((id) => {
      expect(auditService.withoutRequest.log).toHaveBeenCalledWith({
        message: `System has deleted alert [id=${id}]`,
        event: {
          action: 'alert_delete',
          category: ['database'],
          outcome: 'success',
          type: ['deletion'],
        },
      });
    });

    expect(esClient.closePointInTime).toHaveBeenCalledTimes(3);

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
      message: 'Alert deletion task deleted 2 alerts',
      kibana: {
        alert: { deletion: { num_deleted: 2 } },
        space_ids: ['another-space'],
      },
    });
  });

  test('should use search_after to paginate query', async () => {
    esClient.openPointInTime.mockResolvedValueOnce({
      id: 'pit1',
      _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
    });
    esClient.search.mockResolvedValueOnce({
      took: 10,
      timed_out: false,
      _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      pit_id: 'pit1-1',
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
      pit_id: 'pit1-2',
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
      pit_id: 'pit1-3',
      hits: {
        total: { relation: 'eq', value: 2 },
        hits: [getMockAlert({ id: 'mno', searchAfter: ['555'] })],
      },
    });
    esClient.search.mockResolvedValueOnce({
      took: 10,
      timed_out: false,
      _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      pit_id: 'pit1-4',
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
    await alertDeletionClient.runTask(
      {
        ...alertDeletionTaskInstance,
        params: {
          settings: {
            isActiveAlertDeleteEnabled: false,
            isInactiveAlertDeleteEnabled: true,
            activeAlertDeleteThreshold: 1,
            inactiveAlertDeleteThreshold: 30,
          },
          spaceIds: ['default'],
        },
      },
      new AbortController()
    );

    expect(ruleTypeRegistry.getFilteredTypes).toHaveBeenCalledTimes(1);
    expect(ruleTypeRegistry.getFilteredTypes).toHaveBeenCalledWith({
      excludeInternallyManaged: true,
    });

    expect(esClient.openPointInTime).toHaveBeenCalledTimes(1);
    expect(esClient.openPointInTime).toHaveBeenNthCalledWith(1, {
      keep_alive: '1m',
      index: ['alert-index-1'],
      ignore_unavailable: true,
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
        pit: { id: 'pit1-1', keep_alive: '1m' },
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
        pit: { id: 'pit1-2', keep_alive: '1m' },
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
        pit: { id: 'pit1-3', keep_alive: '1m' },
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

    expect(auditService.withoutRequest.log).toHaveBeenCalledTimes(5);
    ['abc', 'def', 'ghi', 'jkl', 'mno'].forEach((id) => {
      expect(auditService.withoutRequest.log).toHaveBeenCalledWith({
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
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit1-4' });

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

  test('should update task state when active alerts are deleted', async () => {
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
    esClient.search.mockResolvedValueOnce({
      took: 10,
      timed_out: false,
      _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
      hits: {
        total: { relation: 'eq', value: 2 },
        hits: [getMockAlert({ id: 'xyz' }), getMockAlert({ id: 'rst' })],
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

    getAlertIndicesAliasMock.mockReturnValueOnce(['alert-index-1']);

    // @ts-ignore - accessing private function for testing
    await alertDeletionClient.runTask(
      {
        ...alertDeletionTaskInstance,
        params: {
          settings: {
            isActiveAlertDeleteEnabled: true,
            isInactiveAlertDeleteEnabled: true,
            activeAlertDeleteThreshold: 90,
            inactiveAlertDeleteThreshold: 30,
            categoryIds: ['observability'],
          },
          spaceIds: ['default'],
        },
      },
      new AbortController()
    );

    expect(ruleTypeRegistry.getFilteredTypes).toHaveBeenCalledTimes(1);
    expect(ruleTypeRegistry.getFilteredTypes).toHaveBeenCalledWith({
      categories: ['observability'],
      excludeInternallyManaged: true,
    });

    expect(esClient.openPointInTime).toHaveBeenCalledTimes(2);
    expect(esClient.openPointInTime).toHaveBeenNthCalledWith(1, {
      keep_alive: '1m',
      index: ['alert-index-1'],
      ignore_unavailable: true,
    });
    expect(esClient.openPointInTime).toHaveBeenNthCalledWith(2, {
      keep_alive: '1m',
      index: ['alert-index-1'],
      ignore_unavailable: true,
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      {
        query: activeAlertsQuery(90, 'default'),
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
        pit: { id: 'pit2', keep_alive: '1m' },
        _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
      },
      { signal: expect.any(AbortSignal) }
    );

    // bulk delete based on search results
    expect(esClient.bulk).toHaveBeenCalledTimes(2);
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

    expect(auditService.withoutRequest.log).toHaveBeenCalledTimes(4);
    ['abc', 'def', 'xyz', 'rst'].forEach((id) => {
      expect(auditService.withoutRequest.log).toHaveBeenCalledWith({
        message: `System has deleted alert [id=${id}]`,
        event: {
          action: 'alert_delete',
          category: ['database'],
          outcome: 'success',
          type: ['deletion'],
        },
      });
    });

    // bulk task state update for active alert setting
    expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledTimes(1);
    expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledWith(['1'], expect.any(Function));

    expect(esClient.closePointInTime).toHaveBeenCalledTimes(2);

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
      message: 'Alert deletion task deleted 4 alerts',
      kibana: {
        alert: { deletion: { num_deleted: 4 } },
        space_ids: ['default'],
      },
    });
  });

  describe('error handling', () => {
    test('should handle invalid category IDs rule settings saved objects', async () => {
      // @ts-ignore - accessing private function for testing
      await alertDeletionClient.runTask(
        {
          ...alertDeletionTaskInstance,
          params: {
            settings: {
              isActiveAlertDeleteEnabled: false,
              isInactiveAlertDeleteEnabled: true,
              activeAlertDeleteThreshold: 1,
              inactiveAlertDeleteThreshold: 30,
              categoryIds: ['invalid-category'],
            },
            spaceIds: ['default'],
          },
        },
        new AbortController()
      );

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

    test('should handle undefined settings in task params', async () => {
      // @ts-ignore - accessing private function for testing
      await alertDeletionClient.runTask(
        {
          ...alertDeletionTaskInstance,
          params: {
            spaceIds: ['default'],
          },
        },
        new AbortController()
      );

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
        error: { message: `Invalid task parameters: {\"spaceIds\":[\"default\"]}` },
        kibana: {
          alert: { deletion: { num_deleted: 0 } },
          space_ids: ['default'],
        },
      });
    });

    test('should handle undefined spaceIds in task params', async () => {
      // @ts-ignore - accessing private function for testing
      await alertDeletionClient.runTask(
        {
          ...alertDeletionTaskInstance,
          params: {
            settings: {
              isActiveAlertDeleteEnabled: false,
              isInactiveAlertDeleteEnabled: true,
              activeAlertDeleteThreshold: 1,
              inactiveAlertDeleteThreshold: 30,
            },
          },
        },
        new AbortController()
      );

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
        error: {
          message: `Invalid task parameters: {\"settings\":{\"isActiveAlertDeleteEnabled\":false,\"isInactiveAlertDeleteEnabled\":true,\"activeAlertDeleteThreshold\":1,\"inactiveAlertDeleteThreshold\":30}}`,
        },
        kibana: {
          alert: { deletion: { num_deleted: 0 } },
        },
      });
    });

    test('should handle errors querying for alerts to delete', async () => {
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
      await alertDeletionClient.runTask(
        {
          ...alertDeletionTaskInstance,
          params: {
            settings: {
              isActiveAlertDeleteEnabled: true,
              isInactiveAlertDeleteEnabled: true,
              activeAlertDeleteThreshold: 45,
              inactiveAlertDeleteThreshold: 100,
            },
            spaceIds: ['default'],
          },
        },
        new AbortController()
      );

      // active alerts search failures should not prevent inactive alerts from being deleted

      // 1 setting with isActiveAlertDeleteEnabled = true
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

      expect(auditService.withoutRequest.log).toHaveBeenCalledTimes(2);
      ['ghi', 'jkl'].forEach((id) => {
        expect(auditService.withoutRequest.log).toHaveBeenCalledWith({
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
      await alertDeletionClient.runTask(
        {
          ...alertDeletionTaskInstance,
          params: {
            settings: {
              isActiveAlertDeleteEnabled: true,
              isInactiveAlertDeleteEnabled: false,
              activeAlertDeleteThreshold: 45,
              inactiveAlertDeleteThreshold: 100,
            },
            spaceIds: ['default'],
          },
        },
        new AbortController()
      );

      expect(esClient.openPointInTime).toHaveBeenCalledTimes(1);
      expect(esClient.openPointInTime).toHaveBeenNthCalledWith(1, {
        keep_alive: '1m',
        index: ['index1', 'index2', 'alert-index-3'],
        ignore_unavailable: true,
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

      expect(auditService.withoutRequest.log).toHaveBeenCalledTimes(2);
      expect(auditService.withoutRequest.log).toHaveBeenNthCalledWith(1, {
        message: `System has deleted alert [id=abc]`,
        event: {
          action: 'alert_delete',
          category: ['database'],
          outcome: 'success',
          type: ['deletion'],
        },
      });
      expect(auditService.withoutRequest.log).toHaveBeenNthCalledWith(2, {
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
      expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledWith(['1'], expect.any(Function));

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
