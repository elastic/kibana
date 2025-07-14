/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { ruleDataServiceMock } from '../rule_data_plugin_service/rule_data_plugin_service.mock';
import type { ConstructorOptions } from './alerts_client';
import { AlertsClient } from './alerts_client';
import { fromKueryExpression } from '@kbn/es-query';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';

describe('AlertsClient', () => {
  const alertingAuthMock = alertingAuthorizationMock.create();
  const ruleDataService = ruleDataServiceMock.create();
  const requestHandlerContext = coreMock.createRequestHandlerContext();
  const esClientScopedMock = requestHandlerContext.elasticsearch.client.asCurrentUser;
  const esClientMock = requestHandlerContext.elasticsearch.client.asInternalUser;
  const getRuleListMock = jest.fn();
  const getAlertIndicesAliasMock = jest.fn();

  let alertsClient: AlertsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    alertingAuthMock.getSpaceId.mockReturnValue('space-1');
    alertingAuthMock.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(
      new Map([
        [
          'test-rule-type-1',
          {
            id: 'test-rule-type-1',
            authorizedConsumers: { foo: { all: true, read: true } },
          },
        ],
      ])
    );

    alertingAuthMock.getAuthorizationFilter.mockResolvedValue({
      filter: fromKueryExpression(
        'alert.attributes.alertTypeId: test-rule-type-1 AND alert.attributes.consumer: foo'
      ),
      ensureRuleTypeIsAuthorized: jest.fn(),
    });

    const alertsClientParams: ConstructorOptions = {
      logger: loggingSystemMock.create().get(),
      authorization: alertingAuthMock,
      esClient: esClientMock,
      esClientScoped: esClientScopedMock,
      ruleDataService,
      getRuleType: jest.fn(),
      getRuleList: getRuleListMock,
      getAlertIndicesAlias: getAlertIndicesAliasMock,
    };

    alertsClient = new AlertsClient(alertsClientParams);
  });

  describe('find', () => {
    it('creates the ruleTypeIds filter correctly', async () => {
      await alertsClient.find({ ruleTypeIds: ['test-rule-type-1', 'test-rule-type-2'] });

      expect(esClientMock.search.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "_source": undefined,
          "aggs": undefined,
          "fields": Array [
            "kibana.alert.rule.rule_type_id",
            "kibana.alert.rule.consumer",
            "kibana.alert.workflow_status",
            "kibana.space_ids",
          ],
          "ignore_unavailable": true,
          "index": ".alerts-*",
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "arguments": Array [
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "alert.attributes.alertTypeId",
                        },
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "test-rule-type-1",
                        },
                      ],
                      "function": "is",
                      "type": "function",
                    },
                    Object {
                      "arguments": Array [
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "alert.attributes.consumer",
                        },
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "foo",
                        },
                      ],
                      "function": "is",
                      "type": "function",
                    },
                  ],
                  "function": "and",
                  "type": "function",
                },
                Object {
                  "terms": Object {
                    "kibana.space_ids": Array [
                      "space-1",
                      "*",
                    ],
                  },
                },
                Object {
                  "terms": Object {
                    "kibana.alert.rule.rule_type_id": Array [
                      "test-rule-type-1",
                      "test-rule-type-2",
                    ],
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          },
          "runtime_mappings": undefined,
          "seq_no_primary_term": true,
          "size": undefined,
          "sort": Array [
            Object {
              "@timestamp": Object {
                "order": "asc",
                "unmapped_type": "date",
              },
            },
          ],
          "track_total_hits": undefined,
        }
      `);
    });

    it('creates the consumers filter correctly', async () => {
      await alertsClient.find({ consumers: ['test-consumer-1', 'test-consumer-2'] });

      expect(esClientMock.search.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "_source": undefined,
          "aggs": undefined,
          "fields": Array [
            "kibana.alert.rule.rule_type_id",
            "kibana.alert.rule.consumer",
            "kibana.alert.workflow_status",
            "kibana.space_ids",
          ],
          "ignore_unavailable": true,
          "index": ".alerts-*",
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "arguments": Array [
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "alert.attributes.alertTypeId",
                        },
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "test-rule-type-1",
                        },
                      ],
                      "function": "is",
                      "type": "function",
                    },
                    Object {
                      "arguments": Array [
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "alert.attributes.consumer",
                        },
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "foo",
                        },
                      ],
                      "function": "is",
                      "type": "function",
                    },
                  ],
                  "function": "and",
                  "type": "function",
                },
                Object {
                  "terms": Object {
                    "kibana.space_ids": Array [
                      "space-1",
                      "*",
                    ],
                  },
                },
                Object {
                  "terms": Object {
                    "kibana.alert.rule.consumer": Array [
                      "test-consumer-1",
                      "test-consumer-2",
                    ],
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          },
          "runtime_mappings": undefined,
          "seq_no_primary_term": true,
          "size": undefined,
          "sort": Array [
            Object {
              "@timestamp": Object {
                "order": "asc",
                "unmapped_type": "date",
              },
            },
          ],
          "track_total_hits": undefined,
        }
      `);
    });
  });

  describe('getRuleTypeIds', () => {
    test('returns an array of rule type ids', async () => {
      const result = alertsClient.getRuleTypeIds([
        '.es-query',
        'logs.alert.document.count',
        'siem.esqlRule',
      ]);

      expect(result).toEqual(['.es-query', 'logs.alert.document.count', 'siem.esqlRule']);
    });

    test('returns an array of rule type IDs for string rule type', async () => {
      const result = alertsClient.getRuleTypeIds('.es-query');

      expect(result).toEqual(['.es-query']);
    });

    test('returns an array of rule type IDs when empty array', async () => {
      jest.spyOn({ getRuleList: getRuleListMock }, 'getRuleList').mockReturnValueOnce(
        new Map([
          ['.es-query', { id: '.es-query' }],
          ['logs.alert.document.count', { id: 'logs.alert.document.count' }],
          ['siem.esqlRule', { id: 'siem.esqlRule' }],
        ])
      );

      const result = alertsClient.getRuleTypeIds([]);

      expect(result).toEqual(['.es-query', 'logs.alert.document.count', 'siem.esqlRule']);
    });

    test('returns an array of rule type IDs when empty string', async () => {
      jest.spyOn({ getRuleList: getRuleListMock }, 'getRuleList').mockReturnValueOnce(
        new Map([
          ['.es-query', { id: '.es-query' }],
          ['logs.alert.document.count', { id: 'logs.alert.document.count' }],
          ['siem.esqlRule', { id: 'siem.esqlRule' }],
        ])
      );
      const result = alertsClient.getRuleTypeIds('');

      expect(result).toEqual(['.es-query', 'logs.alert.document.count', 'siem.esqlRule']);
    });

    test('throws error when no rule types registered', async () => {
      await expect(() => alertsClient.getRuleTypeIds([])).toThrow('No rule types are registered');
    });
  });

  describe('getAlertFields', () => {
    beforeEach(async () => {
      jest.spyOn({ getRuleList: getRuleListMock }, 'getRuleList').mockReturnValue(new Map([]));
      jest
        .spyOn(alertingAuthMock, 'getAllAuthorizedRuleTypesFindOperation')
        .mockResolvedValue(new Map([]));

      jest
        .spyOn({ getAlertIndicesAlias: getAlertIndicesAliasMock }, 'getAlertIndicesAlias')
        .mockImplementation((ruleTypeIds: string[]) => {
          return Promise.resolve([]);
        });

      IndexPatternsFetcher.prototype.getFieldsForWildcard = jest.fn().mockResolvedValue({
        fields: [],
        indices: [],
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should fetch all rule types when ruleTypeIds is empty array', async () => {
      await alertsClient.getAlertFields([]);

      expect(getRuleListMock).toHaveBeenCalled();
    });

    test('should fetch all rule types when ruleTypeIds is empty string', async () => {
      await alertsClient.getAlertFields('');

      expect(getRuleListMock).toHaveBeenCalled();
    });

    test('should fetch alert indices separately for siem and other rule types', async () => {
      jest.spyOn(alertingAuthMock, 'getAllAuthorizedRuleTypesFindOperation').mockResolvedValue(
        // @ts-expect-error: mocking only necessary methods
        new Map([
          ['.es-query', {}],
          ['logs.alert.document.count', {}],
          ['siem.esqlRule', {}],
        ])
      );

      await alertsClient.getAlertFields([
        '.es-query',
        'logs.alert.document.count',
        'siem.esqlRule',
      ]);

      expect(getAlertIndicesAliasMock).toHaveBeenCalledTimes(2);
      expect(getAlertIndicesAliasMock).nthCalledWith(1, ['siem.esqlRule']);
      expect(getAlertIndicesAliasMock).nthCalledWith(2, ['.es-query', 'logs.alert.document.count']);
    });

    test('should fetch alert fields correctly', async () => {
      jest.spyOn(alertingAuthMock, 'getAllAuthorizedRuleTypesFindOperation').mockResolvedValue(
        // @ts-expect-error: mocking only necessary methods
        new Map([
          ['.es-query', {}],
          ['logs.alert.document.count', {}],
          ['siem.esqlRule', {}],
        ])
      );

      jest
        .spyOn({ getAlertIndicesAlias: getAlertIndicesAliasMock }, 'getAlertIndicesAlias')
        .mockImplementation((ruleTypeIds: string[]) => {
          if (ruleTypeIds.includes('siem.esqlRule')) {
            return Promise.resolve(['.alerts-security.alerts-default']);
          } else {
            return Promise.resolve([
              '.alerts-stack.alerts-default',
              '.alerts-observability.logs.alerts-default',
            ]);
          }
        });

      IndexPatternsFetcher.prototype.getFieldsForWildcard = jest
        .fn()
        .mockResolvedValueOnce({
          fields: [
            { name: '@timestamp', type: 'date' },
            { name: 'event.category', type: 'string' },
            { name: 'signal.status', type: 'keyword' },
          ],
          indices: ['.alerts-security.alerts-default'],
        })
        .mockResolvedValueOnce({
          fields: [
            { name: 'message', type: 'string' },
            { name: 'log.level', type: 'string' },
          ],
          indices: ['.alerts-stack.alerts-default', '.alerts-observability.logs.alerts-default'],
        });

      const response = await alertsClient.getAlertFields([
        '.es-query',
        'logs.alert.document.count',
        'siem.esqlRule',
      ]);

      expect(response.fields).toEqual([
        {
          name: 'message',
          type: 'string',
        },
        {
          name: 'log.level',
          type: 'string',
        },
        {
          name: '@timestamp',
          type: 'date',
        },
        {
          name: 'event.category',
          type: 'string',
        },
        { name: 'signal.status', type: 'keyword' },
      ]);
      expect(response.alertFields).toBeDefined();
    });

    test('returns only SIEM fields when no other rule types are authorized', async () => {
      // Mock authorization to return only SIEM rule types
      jest
        .spyOn(alertingAuthMock, 'getAllAuthorizedRuleTypesFindOperation')
        .mockResolvedValueOnce(new Map([['siem.esqlRule', { authorizedConsumers: {} }]]));

      jest
        .spyOn({ getAlertIndicesAlias: getAlertIndicesAliasMock }, 'getAlertIndicesAlias')
        .mockImplementation((ruleTypeIds: string[]) => {
          if (ruleTypeIds.includes('siem.esqlRule')) {
            return Promise.resolve(['.alerts-security.alerts-default']);
          } else {
            return Promise.resolve([]);
          }
        });

      IndexPatternsFetcher.prototype.getFieldsForWildcard = jest
        .fn()
        .mockResolvedValueOnce({
          fields: [
            { name: '@timestamp', type: 'date' },
            { name: 'event.category', type: 'string' },
            { name: 'signal.status', type: 'keyword' },
          ],
          indices: ['.alerts-security.alerts-default'],
        })
        .mockResolvedValueOnce({
          fields: [],
          indices: [],
        });

      const response = await alertsClient.getAlertFields(['siem.esqlRule']);

      // should not fetch other fields as there are no other indices
      expect(IndexPatternsFetcher.prototype.getFieldsForWildcard).toHaveBeenCalledTimes(1);

      expect(IndexPatternsFetcher.prototype.getFieldsForWildcard).toHaveBeenCalledWith({
        fieldCapsOptions: {
          allow_no_indices: true,
        },
        includeEmptyFields: false,
        indexFilter: {
          range: {
            '@timestamp': {
              gte: 'now-90d',
            },
          },
        },
        pattern: '.alerts-security.alerts-default',
        metaFields: ['_id', '_index'],
      });

      expect(response.fields).toHaveLength(3);
      expect(response.fields).toEqual([
        { name: '@timestamp', type: 'date' },
        { name: 'event.category', type: 'string' },
        { name: 'signal.status', type: 'keyword' },
      ]);
    });

    test('merges fields and removes duplicates', async () => {
      jest.spyOn(alertingAuthMock, 'getAllAuthorizedRuleTypesFindOperation').mockResolvedValue(
        // @ts-expect-error: mocking only necessary methods
        new Map([
          ['.es-query', {}],
          ['logs.alert.document.count', {}],
          ['siem.esqlRule', {}],
        ])
      );

      jest
        .spyOn({ getAlertIndicesAlias: getAlertIndicesAliasMock }, 'getAlertIndicesAlias')
        .mockImplementation((ruleTypeIds: string[]) => {
          if (ruleTypeIds.includes('siem.esqlRule')) {
            return Promise.resolve(['.alerts-security.alerts-default']);
          } else {
            return Promise.resolve(['.alerts-stack.alerts-default']);
          }
        });

      IndexPatternsFetcher.prototype.getFieldsForWildcard = jest
        .fn()
        .mockResolvedValue({
          fields: [
            { name: 'user.name', type: 'string' },
            { name: 'source.ip', type: 'ip' },
          ],
          indices: ['.alerts-security.alerts-default'],
        })
        .mockResolvedValueOnce({
          fields: [
            { name: 'source.ip', type: 'ip' },
            { name: 'destination.port', type: 'number' },
          ],
          indices: ['.alerts-stack.alerts-default'],
        });

      const response = await alertsClient.getAlertFields(['siem.esqlRule', '.es-query']);

      expect(response.fields).toHaveLength(3);
      expect(response.fields).toEqual([
        { name: 'user.name', type: 'string' },
        { name: 'source.ip', type: 'ip' },
        { name: 'destination.port', type: 'number' },
      ]);
    });

    test('returns empty fields when no rule types are authorized', async () => {
      jest
        .spyOn(alertingAuthMock, 'getAllAuthorizedRuleTypesFindOperation')
        .mockResolvedValue(new Map());
      const response = await alertsClient.getAlertFields(['siem.esqlRule']);
      expect(response.fields).toHaveLength(0);
      expect(response.alertFields).toEqual({});
    });

    test('returns empty fields when no indices are found', async () => {
      jest.spyOn(alertingAuthMock, 'getAllAuthorizedRuleTypesFindOperation').mockResolvedValue(
        // @ts-expect-error: mocking only necessary methods
        new Map([['siem.esqlRule', {}]])
      );

      jest
        .spyOn({ getAlertIndicesAlias: getAlertIndicesAliasMock }, 'getAlertIndicesAlias')
        .mockImplementation(() => Promise.resolve([]));

      const response = await alertsClient.getAlertFields(['siem.esqlRule']);

      expect(response.fields).toHaveLength(0);
      expect(response.alertFields).toEqual({});
    });
  });
});
