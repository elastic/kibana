/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../common/constants';
import { requestContextMock } from './__mocks__/request_context';
import { getAlertsGroupAggregationsRequest } from './__mocks__/request_responses';
import { requestMock, serverMock } from './__mocks__/server';
import { AlertsClient } from '..';
import { getAlertsGroupAggregations } from './get_alerts_group_aggregations';

const getMockAggregations = () =>
  ({
    took: 17,
    timed_out: false,
    _shards: {
      total: 9,
      successful: 9,
      skipped: 5,
      failed: 0,
    },
    hits: {
      total: {
        value: 185,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      groupsCount: {
        value: 5,
      },
      groupByFields: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'CPU Usage',
            doc_count: 179,
            unitsCount: {
              value: 179,
            },
            description: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            usersCountAggregation: {
              value: 0,
            },
            hostsCountAggregation: {
              value: 0,
            },
            ruleTags: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
          },
          {
            key: 'Synthetics',
            doc_count: 2,
            unitsCount: {
              value: 2,
            },
            description: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            usersCountAggregation: {
              value: 0,
            },
            hostsCountAggregation: {
              value: 0,
            },
            ruleTags: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'SYNTHETICS_DEFAULT_ALERT',
                  doc_count: 2,
                },
              ],
            },
          },
          {
            key: 'ES|QL',
            doc_count: 2,
            unitsCount: {
              value: 2,
            },
            description: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            usersCountAggregation: {
              value: 0,
            },
            hostsCountAggregation: {
              value: 0,
            },
            ruleTags: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
          },
          {
            key: 'ES Query',
            doc_count: 1,
            unitsCount: {
              value: 1,
            },
            description: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            usersCountAggregation: {
              value: 0,
            },
            hostsCountAggregation: {
              value: 0,
            },
            ruleTags: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
          },
          {
            key: 'Log',
            doc_count: 1,
            unitsCount: {
              value: 1,
            },
            description: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
            usersCountAggregation: {
              value: 0,
            },
            hostsCountAggregation: {
              value: 0,
            },
            ruleTags: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [],
            },
          },
        ],
      },
      unitsCount: {
        value: 185,
      },
    },
  } as unknown as ReturnType<AlertsClient['getGroupAggregations']>);

describe('getAlertsGroupAggregations', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rac.getGroupAggregations.mockResolvedValue(getMockAggregations());

    getAlertsGroupAggregations(server.router);
  });

  test('returns 200 when the parameters are correct', async () => {
    const response = await server.inject(getAlertsGroupAggregationsRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(getMockAggregations());
  });

  describe('request validation', () => {
    test('rejects with missing params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
            body: {
              groupByField: 'kibana.alert.rule.name',
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'Invalid value \\"undefined\\" supplied to \\"ruleTypeIds\\"'"`
      );
    });

    test('rejects with invalid params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
            body: {
              ruleTypeIds: [
                'apm.anomaly',
                'logs.alert.document.count',
                'metrics.alert.threshold',
                'slo.rules.burnRate',
                'xpack.uptime.alerts.durationAnomaly',
              ],
              groupByField: 'kibana.alert.rule.name',
              aggregations: {
                scriptedAggregation: {
                  script: '100',
                },
              },
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'invalid keys \\"script\\"'"`
      );
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
            body: {
              ruleTypeIds: [
                'apm.anomaly',
                'logs.alert.document.count',
                'metrics.alert.threshold',
                'slo.rules.burnRate',
                'xpack.uptime.alerts.durationAnomaly',
              ],
              groupByField: 'kibana.alert.rule.name',
              filters: [
                {
                  script: {
                    script: '100',
                  },
                },
              ],
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'invalid keys \\"script\\"'"`
      );
    });

    test('rejects unknown query params', async () => {
      await expect(
        server.inject(
          requestMock.create({
            method: 'post',
            path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
            body: {
              ruleTypeIds: [
                'apm.anomaly',
                'logs.alert.document.count',
                'metrics.alert.threshold',
                'slo.rules.burnRate',
                'xpack.uptime.alerts.durationAnomaly',
              ],
              groupByField: 'kibana.alert.rule.name',
              aggregations: {},
              runtimeMappings: {},
            },
          }),
          context
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Request was rejected with message: 'invalid keys \\"runtimeMappings,{}\\"'"`
      );
    });
  });

  test('returns error status if rac client find fails', async () => {
    clients.rac.getGroupAggregations.mockRejectedValue(new Error('Unable to get alerts'));
    const response = await server.inject(getAlertsGroupAggregationsRequest(), context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      attributes: { success: false },
      message: 'Unable to get alerts',
    });
  });

  test('rejects without ruleTypeIds', async () => {
    await expect(
      server.inject(
        requestMock.create({
          method: 'post',
          path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
          body: {
            groupByField: 'kibana.alert.rule.name',
          },
        }),
        context
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Request was rejected with message: 'Invalid value \\"undefined\\" supplied to \\"ruleTypeIds\\"'"`
    );
  });

  test('accepts consumers', async () => {
    await expect(
      server.inject(
        requestMock.create({
          method: 'post',
          path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
          body: {
            ruleTypeIds: [
              'apm.anomaly',
              'logs.alert.document.count',
              'metrics.alert.threshold',
              'slo.rules.burnRate',
              'xpack.uptime.alerts.durationAnomaly',
            ],
            groupByField: 'kibana.alert.rule.name',
            consumers: ['foo'],
          },
        }),
        context
      )
    ).resolves.not.toThrow();
  });

  test('calls the alerts client correctly', async () => {
    await expect(
      server.inject(
        requestMock.create({
          method: 'post',
          path: `${BASE_RAC_ALERTS_API_PATH}/_group_aggregations`,
          body: {
            ruleTypeIds: [
              'apm.anomaly',
              'logs.alert.document.count',
              'metrics.alert.threshold',
              'slo.rules.burnRate',
              'xpack.uptime.alerts.durationAnomaly',
            ],
            groupByField: 'kibana.alert.rule.name',
            consumers: ['foo'],
          },
        }),
        context
      )
    ).resolves.not.toThrow();

    expect(clients.rac.getGroupAggregations).toHaveBeenCalledWith({
      aggregations: undefined,
      consumers: ['foo'],
      filters: undefined,
      groupByField: 'kibana.alert.rule.name',
      pageIndex: 0,
      pageSize: 10,
      ruleTypeIds: [
        'apm.anomaly',
        'logs.alert.document.count',
        'metrics.alert.threshold',
        'slo.rules.burnRate',
        'xpack.uptime.alerts.durationAnomaly',
      ],
      sort: undefined,
    });
  });
});
