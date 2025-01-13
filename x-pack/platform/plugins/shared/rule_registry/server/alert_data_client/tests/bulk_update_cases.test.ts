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
import {
  ALERT_CASE_IDS,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  MAX_CASES_PER_ALERT,
} from '@kbn/rule-data-utils';
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { ruleDataServiceMock } from '../../rule_data_plugin_service/rule_data_plugin_service.mock';

describe('bulkUpdateCases', () => {
  const alertingAuthMock = alertingAuthorizationMock.create();
  const esClientMock = elasticsearchClientMock.createElasticsearchClient();
  const auditLogger = auditLoggerMock.create();
  const caseIds = ['test-case'];
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

    esClientMock.mget.mockResponse({
      docs: [
        {
          found: true,
          _id: 'alert-id',
          _index: 'alert-index',
          _source: {
            [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
            [ALERT_RULE_CONSUMER]: 'apm',
            [ALERT_CASE_IDS]: caseIds,
          },
        },
      ],
    });
  });

  it('bulks update the alerts with case info correctly', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    await alertsClient.bulkUpdateCases({ caseIds, alerts });

    expect(esClientMock.mget).toHaveBeenCalledWith({
      docs: [{ _id: 'alert-id', _index: 'alert-index' }],
    });

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
            "doc": Object {
              "kibana.alert.case_ids": Array [
                "test-case",
              ],
            },
          },
        ],
        "refresh": "wait_for",
      }
    `);
  });

  it('bulks update correctly with multiple cases and alerts', async () => {
    const multipleAlerts = [
      ...alerts,
      {
        id: 'alert-id-2',
        index: 'alert-index-2',
      },
    ];

    const multipleCases = [...caseIds, 'another-case'];

    esClientMock.mget.mockResponse({
      docs: multipleAlerts.map((alert) => ({
        found: true,
        _id: alert.id,
        _index: alert.index,
        _source: {
          [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
          [ALERT_RULE_CONSUMER]: 'apm',
          [ALERT_CASE_IDS]: multipleCases,
        },
      })),
    });

    const alertsClient = new AlertsClient(alertsClientParams);

    await alertsClient.bulkUpdateCases({
      caseIds: multipleCases,
      alerts: multipleAlerts,
    });

    expect(esClientMock.mget).toHaveBeenCalledWith({
      docs: [
        { _id: 'alert-id', _index: 'alert-index' },
        { _id: 'alert-id-2', _index: 'alert-index-2' },
      ],
    });

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
            "doc": Object {
              "kibana.alert.case_ids": Array [
                "test-case",
                "another-case",
              ],
            },
          },
          Object {
            "update": Object {
              "_id": "alert-id-2",
              "_index": "alert-index-2",
            },
          },
          Object {
            "doc": Object {
              "kibana.alert.case_ids": Array [
                "test-case",
                "another-case",
              ],
            },
          },
        ],
        "refresh": "wait_for",
      }
    `);
  });

  it('removes duplicated cases', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);

    await alertsClient.bulkUpdateCases({
      caseIds: [...caseIds, ...caseIds],
      alerts,
    });

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
            "doc": Object {
              "kibana.alert.case_ids": Array [
                "test-case",
              ],
            },
          },
        ],
        "refresh": "wait_for",
      }
    `);
  });

  it('calls ensureAllAlertsAuthorized correctly', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    await alertsClient.bulkUpdateCases({ caseIds, alerts });

    expect(alertingAuthMock.ensureAuthorized).toHaveBeenCalledWith({
      consumer: 'apm',
      entity: 'alert',
      operation: 'get',
      ruleTypeId: 'apm.error_rate',
    });
  });

  it(`throws an error when adding a case to an alert with ${MAX_CASES_PER_ALERT} cases`, async () => {
    esClientMock.mget.mockResponse({
      docs: [
        {
          found: true,
          _id: 'alert-id',
          _index: 'alert-index',
          _source: {
            [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
            [ALERT_RULE_CONSUMER]: 'apm',
            [ALERT_CASE_IDS]: Array.from(Array(10).keys()),
          },
        },
      ],
    });

    const alertsClient = new AlertsClient(alertsClientParams);

    await expect(
      alertsClient.bulkUpdateCases({ caseIds, alerts })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"You cannot attach more than 10 cases to an alert"`
    );
  });

  it(`throws an error when adding more than ${MAX_CASES_PER_ALERT} cases to an alert`, async () => {
    esClientMock.mget.mockResponse({
      docs: [
        {
          found: true,
          _id: 'alert-id',
          _index: 'alert-index',
          _source: {
            [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
            [ALERT_RULE_CONSUMER]: 'apm',
            [ALERT_CASE_IDS]: [],
          },
        },
      ],
    });

    const alertsClient = new AlertsClient(alertsClientParams);
    const multipleCases = Array.from(Array(11).values());

    await expect(
      alertsClient.bulkUpdateCases({ caseIds: multipleCases, alerts })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"You cannot attach more than 10 cases to an alert"`
    );
  });

  it(`throws an error when the sum of cases extends the limit of ${MAX_CASES_PER_ALERT} cases per alert`, async () => {
    esClientMock.mget.mockResponse({
      docs: [
        {
          found: true,
          _id: 'alert-id',
          _index: 'alert-index',
          _source: {
            [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
            [ALERT_RULE_CONSUMER]: 'apm',
            [ALERT_CASE_IDS]: Array.from(Array(5).keys()),
          },
        },
      ],
    });

    const alertsClient = new AlertsClient(alertsClientParams);
    const multipleCases = Array.from(Array(6).values());

    await expect(
      alertsClient.bulkUpdateCases({ caseIds: multipleCases, alerts })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"You cannot attach more than 10 cases to an alert"`
    );
  });

  it('throws an error when no alerts are provided', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);

    await expect(
      alertsClient.bulkUpdateCases({ caseIds, alerts: [] })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"You need to define at least one alert to update case ids"`
    );
  });

  it(`throws an error when the provided case ids are more than ${MAX_CASES_PER_ALERT}`, async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const multipleCases = Array.from(Array(11).values());

    await expect(
      alertsClient.bulkUpdateCases({ caseIds: multipleCases, alerts })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"You cannot attach more than 10 cases to an alert"`
    );
  });
});
