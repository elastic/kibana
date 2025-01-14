/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { ruleDataServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';

describe('remove cases from alerts', () => {
  describe('removeCaseIdFromAlerts', () => {
    const alertingAuthMock = alertingAuthorizationMock.create();
    const esClientMock = elasticsearchClientMock.createElasticsearchClient();
    const auditLogger = auditLoggerMock.create();
    const caseId = 'test-case';
    const alerts = [
      {
        id: 'alert-id',
        index: 'alert-index',
      },
    ];

    const alertsClientParams: jest.Mocked<ConstructorOptions> = {
      logger: loggingSystemMock.create().get(),
      authorization: alertingAuthMock,
      esClient: esClientMock,
      auditLogger,
      ruleDataService: ruleDataServiceMock.create(),
      getRuleType: jest.fn(),
      getRuleList: jest.fn(),
      getAlertIndicesAlias: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('removes alerts from a case', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.removeCaseIdFromAlerts({ caseId, alerts });

      expect(esClientMock.bulk.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "body": Array [
            Object {
              "update": Object {
                "_id": "alert-id",
                "_index": "alert-index",
              },
            },
            Object {
              "script": Object {
                "lang": "painless",
                "source": "if (ctx._source['kibana.alert.case_ids'] != null) {
                if (ctx._source['kibana.alert.case_ids'].contains('test-case')) {
                  int index = ctx._source['kibana.alert.case_ids'].indexOf('test-case');
                  ctx._source['kibana.alert.case_ids'].remove(index);
                }
              }",
              },
            },
          ],
          "refresh": "wait_for",
        }
      `);
    });

    it('does not do any calls if there are no alerts', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.removeCaseIdFromAlerts({ caseId, alerts: [] });

      expect(esClientMock.bulk).not.toHaveBeenCalled();
    });
  });

  describe('removeCaseIdsFromAllAlerts', () => {
    const alertingAuthMock = alertingAuthorizationMock.create();
    const esClientMock = elasticsearchClientMock.createElasticsearchClient();
    const auditLogger = auditLoggerMock.create();
    const caseIds = ['test-case-1', 'test-case-2'];

    const alertsClientParams: jest.Mocked<ConstructorOptions> = {
      logger: loggingSystemMock.create().get(),
      authorization: alertingAuthMock,
      esClient: esClientMock,
      auditLogger,
      ruleDataService: ruleDataServiceMock.create(),
      getRuleType: jest.fn(),
      getRuleList: jest.fn(),
      getAlertIndicesAlias: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('removes alerts from a case', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.removeCaseIdsFromAllAlerts({ caseIds });

      expect(esClientMock.updateByQuery.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "conflicts": "proceed",
          "ignore_unavailable": true,
          "index": "undefined-*",
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "bool": Object {
                    "minimum_should_match": 1,
                    "should": Array [
                      Object {
                        "bool": Object {
                          "minimum_should_match": 1,
                          "should": Array [
                            Object {
                              "match": Object {
                                "kibana.alert.case_ids": "test-case-1",
                              },
                            },
                          ],
                        },
                      },
                      Object {
                        "bool": Object {
                          "minimum_should_match": 1,
                          "should": Array [
                            Object {
                              "match": Object {
                                "kibana.alert.case_ids": "test-case-2",
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          },
          "script": Object {
            "lang": "painless",
            "params": Object {
              "caseIds": Array [
                "test-case-1",
                "test-case-2",
              ],
            },
            "source": "if (ctx._source['kibana.alert.case_ids'] != null && ctx._source['kibana.alert.case_ids'].length > 0 && params['caseIds'] != null && params['caseIds'].length > 0) {
                List storedCaseIds = ctx._source['kibana.alert.case_ids'];
                List caseIdsToRemove = params['caseIds'];

                for (int i=0; i < caseIdsToRemove.length; i++) {
                  if (storedCaseIds.contains(caseIdsToRemove[i])) {
                    int index = storedCaseIds.indexOf(caseIdsToRemove[i]);
                    storedCaseIds.remove(index);
                  }
                }
              }",
          },
        }
      `);
    });

    it('does not do any calls if there are no cases', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.removeCaseIdsFromAllAlerts({ caseIds: [] });

      expect(esClientMock.updateByQuery).not.toHaveBeenCalled();
    });
  });
});
