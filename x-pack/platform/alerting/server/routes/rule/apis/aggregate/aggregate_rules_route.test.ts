/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateRulesRoute } from './aggregate_rules_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { trackLegacyTerminology } from '../../../lib/track_legacy_terminology';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

const rulesClient = rulesClientMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../../lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

const aggregateResult = {
  status: {
    buckets: [
      {
        key: 'ok',
        doc_count: 15,
      },
      {
        key: 'error',
        doc_count: 2,
      },
      {
        key: 'active',
        doc_count: 23,
      },
      {
        key: 'pending',
        doc_count: 1,
      },
      {
        key: 'unknown',
        doc_count: 0,
      },
      {
        key: 'warning',
        doc_count: 10,
      },
    ],
  },
  outcome: {
    buckets: [
      {
        key: 'succeeded',
        doc_count: 2,
      },
      {
        key: 'failed',
        doc_count: 4,
      },
      {
        key: 'warning',
        doc_count: 6,
      },
    ],
  },
  enabled: {
    buckets: [
      {
        key: 0,
        key_as_string: '0',
        doc_count: 2,
      },
      {
        key: 1,
        key_as_string: '1',
        doc_count: 28,
      },
    ],
  },
  muted: {
    buckets: [
      {
        key: 0,
        key_as_string: '0',
        doc_count: 27,
      },
      {
        key: 1,
        key_as_string: '1',
        doc_count: 3,
      },
    ],
  },
  snoozed: {
    doc_count: 0,
    count: {
      doc_count: 0,
    },
  },
  tags: {
    buckets: [
      {
        key: 'a',
        doc_count: 10,
      },
      {
        key: 'b',
        doc_count: 20,
      },
      {
        key: 'c',
        doc_count: 30,
      },
    ],
  },
};

describe('aggregateRulesRoute', () => {
  it('aggregate rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/_aggregate"`);

    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: {
          default_search_operator: 'AND',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "rule_enabled_status": Object {
            "disabled": 2,
            "enabled": 28,
          },
          "rule_execution_status": Object {
            "active": 23,
            "error": 2,
            "ok": 15,
            "pending": 1,
            "unknown": 0,
            "warning": 10,
          },
          "rule_last_run_outcome": Object {
            "failed": 4,
            "succeeded": 2,
            "warning": 6,
          },
          "rule_muted_status": Object {
            "muted": 3,
            "unmuted": 27,
          },
          "rule_snoozed_status": Object {
            "snoozed": 0,
          },
          "rule_tags": Array [
            "a",
            "b",
            "c",
          ],
        },
      }
    `);

    expect(rulesClient.aggregate).toHaveBeenCalledTimes(1);
    expect(rulesClient.aggregate.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "aggs": Object {
            "enabled": Object {
              "terms": Object {
                "field": "alert.attributes.enabled",
              },
            },
            "muted": Object {
              "terms": Object {
                "field": "alert.attributes.muteAll",
              },
            },
            "outcome": Object {
              "terms": Object {
                "field": "alert.attributes.lastRun.outcome",
              },
            },
            "snoozed": Object {
              "aggs": Object {
                "count": Object {
                  "filter": Object {
                    "exists": Object {
                      "field": "alert.attributes.snoozeSchedule.duration",
                    },
                  },
                },
              },
              "nested": Object {
                "path": "alert.attributes.snoozeSchedule",
              },
            },
            "status": Object {
              "terms": Object {
                "field": "alert.attributes.executionStatus.status",
              },
            },
            "tags": Object {
              "terms": Object {
                "field": "alert.attributes.tags",
                "order": Object {
                  "_key": "asc",
                },
                "size": 50,
              },
            },
          },
          "options": Object {
            "defaultSearchOperator": "AND",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        rule_enabled_status: {
          disabled: 2,
          enabled: 28,
        },
        rule_execution_status: {
          ok: 15,
          error: 2,
          active: 23,
          pending: 1,
          unknown: 0,
          warning: 10,
        },
        rule_last_run_outcome: {
          failed: 4,
          succeeded: 2,
          warning: 6,
        },
        rule_muted_status: {
          muted: 3,
          unmuted: 27,
        },
        rule_snoozed_status: {
          snoozed: 0,
        },
        rule_tags: ['a', 'b', 'c'],
      },
    });
  });

  it('ensures the license allows aggregating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: {
          default_search_operator: 'OR',
        },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents aggregating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    aggregateRulesRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        body: {},
      },
      ['ok']
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('should track calls with deprecated param values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    aggregateRulesRoute(router, licenseState, mockUsageCounter);
    const [, handler] = router.post.mock.calls[0];

    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {},
        body: {
          search_fields: ['alertTypeId:1', 'message:foo'],
          search: 'alertTypeId:2',
        },
      },
      ['ok']
    );
    await handler(context, req, res);
    expect(trackLegacyTerminology).toHaveBeenCalledTimes(1);
    expect((trackLegacyTerminology as jest.Mock).mock.calls[0][0]).toStrictEqual([
      'alertTypeId:2',
      ['alertTypeId:1', 'message:foo'],
    ]);
  });
});
