/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { deleteAlerts } from './delete_alerts';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS } from '@kbn/rule-data-utils';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { asOk } from '@kbn/task-manager-plugin/server/lib/result_type';
import { TaskStatus } from '@kbn/task-manager-plugin/server';

const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const logger = loggingSystemMock.create().get();
const taskManagerStart = taskManagerMock.createStart();

describe('deleteAlerts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should delete inactive alerts by query', async () => {
    esClient.deleteByQuery.mockResolvedValue({  deleted: 1  });
    const numDeleted = await deleteAlerts({
      alertDeletionSettings: {
        isActiveAlertsDeletionEnabled: false,
        isInactiveAlertsDeletionEnabled: true,
        activeAlertsDeletionThreshold: 1,
        inactiveAlertsDeletionThreshold: 30,
      },
      indices: ['index1', 'index2'],
      esClient,
      logger,
      spaceId: 'space-1',
      taskManagerStart,
    });

    expect(esClient.count).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      query: {
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
                            should: [ { range: { '@timestamp': {lt: 'now-30d' } }}]
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
                            should: [ { range: { 'kibana.alert.workflow_status_updated_at': {lt: 'now-30d' } }}]
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
                            should: [ { range: { 'kibana.alert.end': {lt: 'now-30d' } }}]
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
                should: [ { match: { 'kibana.space_ids': 'space-1' }}]
              }
            }
          ]
        }
      }
    });

    expect(numDeleted).toEqual(1);
  });

  test('should return count of inactive alerts if dryRun = true', async () => {
    esClient.count.mockResolvedValue({  count: 1, _shards: { failed: 0, successful: 0, total: 0}  });
    const numDeleted = await deleteAlerts({
      alertDeletionSettings: {
        isActiveAlertsDeletionEnabled: false,
        isInactiveAlertsDeletionEnabled: true,
        activeAlertsDeletionThreshold: 1,
        inactiveAlertsDeletionThreshold: 30,
      },
      dryRun: true,
      indices: ['index1', 'index2'],
      esClient,
      logger,
      spaceId: 'space-1',
      taskManagerStart,
    });

    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    expect(esClient.count).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      query: {
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
                            should: [ { range: { '@timestamp': {lt: 'now-30d' } }}]
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
                            should: [ { range: { 'kibana.alert.workflow_status_updated_at': {lt: 'now-30d' } }}]
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
                            should: [ { range: { 'kibana.alert.end': {lt: 'now-30d' } }}]
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
                should: [ { match: { 'kibana.space_ids': 'space-1' }}]
              }
            }
          ]
        }
      }
    });

    expect(numDeleted).toEqual(1);
  });

  test('should delete active alerts', async () => {
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
              [SPACE_IDS]: ['space-1'],
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
              [SPACE_IDS]: ['space-1'],
            },
          },
        ],
      },
    });
    taskManagerStart.bulkGet.mockResolvedValueOnce([
      asOk({
        id: 'task:1',
        taskType: 'alerting:123',
        scheduledAt: new Date(),
        attempts: 1,
        status: TaskStatus.Idle,
        runAt: new Date(),
        startedAt: null,
        retryAt: null,
        state: {
          alertInstances: {
            'query matched': {
              meta: { lastScheduledActions: { group: 'default', date: new Date().toISOString() }, uuid: '1' },
              state: { bar: false }
            },
            'host-1': {
              meta: { lastScheduledActions: { group: 'default', date: new Date().toISOString() }, uuid: '2' },
              state: { bar: false }
            },
          },
        },
        params: {
          alertId: '1',
        },
        ownerId: null,
      }),
      asOk({
        id: 'task:3',
        taskType: 'alerting:123',
        scheduledAt: new Date(),
        attempts: 1,
        status: TaskStatus.Idle,
        runAt: new Date(),
        startedAt: null,
        retryAt: null,
        state: {
          alertInstances: {
            'threshold exceeded': {
              meta: { lastScheduledActions: { group: 'default', date: new Date().toISOString() }, uuid: '3' },
              state: { bar: false }
            },
          },
        },
        params: {
          alertId: '1',
        },
        ownerId: null,
      })
    ]);
    const numDeleted = await deleteAlerts({
      alertDeletionSettings: {
        isActiveAlertsDeletionEnabled: true,
        isInactiveAlertsDeletionEnabled: false,
        activeAlertsDeletionThreshold: 45,
        inactiveAlertsDeletionThreshold: 1,
      },
      indices: ['index1', 'index2'],
      esClient,
      logger,
      spaceId: 'space-1',
      taskManagerStart,
    });

    expect(esClient.count).not.toHaveBeenCalled();
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith({
      index: ['index1', 'index2'],
      _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID],
      query: {
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
                should: [ { range: { 'kibana.alert.start': { lt: 'now-45d'} }}]
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
                should: [ { match: { 'kibana.space_ids': 'space-1' }}]
              }
            }
          ]
        }
      }
    });
    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: [
        { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'abc' } },
        { delete: { _index: '.internal.alerts-test.alerts-default-000001', _id: 'def' } },
      ]
    });
    expect(taskManagerStart.bulkUpdateState).toHaveBeenCalledWith(['task:1', 'task:3'], expect.any(Function));
  });

});
