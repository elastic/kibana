/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleHealthRoute } from './rule_health_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import type { RuleHealthAggregationResult } from './types';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../../lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

const aggregateResult: RuleHealthAggregationResult = {
  status: {
    buckets: [
      { key: 'ok', doc_count: 15 },
      { key: 'error', doc_count: 2 },
      { key: 'active', doc_count: 23 },
    ],
  },
  outcome: {
    buckets: [
      { key: 'succeeded', doc_count: 38 },
      { key: 'failed', doc_count: 2 },
    ],
  },
  error_reason: {
    buckets: [
      {
        key: 'validate',
        doc_count: 2,
        message: { buckets: [{ key: '[params.index]: expected value', doc_count: 2 }] },
      },
    ],
  },
  warning_reason: { buckets: [] },
  api_key_error: {
    buckets: [{ key: 'failed to authenticate cloud API key: [0x28D520]', doc_count: 1 }],
  },
  missing_api_key: { doc_count: 1 },
  legacy_missing_api_key: { doc_count: 0 },
};

describe('ruleHealthRoute', () => {
  it('aggregates rule health with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    ruleHealthRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/_health"`);
    expect(config.options?.access).toBe('internal');

    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: {
          default_search_operator: 'AND',
          rule_type_ids: ['foo'],
          consumers: ['bar'],
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "api_key_error": Object {
            "count": 1,
            "messages": Array [
              "failed to authenticate cloud API key: [0x28D520]",
            ],
          },
          "by_error_reason": Array [
            Object {
              "count": 2,
              "reason": "validate",
            },
          ],
          "by_outcome": Object {
            "failed": 2,
            "succeeded": 38,
            "warning": 0,
          },
          "by_status": Object {
            "active": 23,
            "error": 2,
            "ok": 15,
            "pending": 0,
            "unknown": 0,
            "warning": 0,
          },
          "by_warning_reason": Array [],
          "missing_api_key": Object {
            "count": 1,
          },
          "top_error_messages": Array [
            Object {
              "count": 2,
              "message": "[params.index]: expected value",
              "reason": "validate",
            },
          ],
          "total": 40,
        },
      }
    `);

    expect(rulesClient.aggregate).toHaveBeenCalledTimes(1);
    const [{ aggs, options }] = rulesClient.aggregate.mock.calls[0];
    expect(Object.keys(aggs).sort()).toEqual([
      'api_key_error',
      'error_reason',
      'legacy_missing_api_key',
      'missing_api_key',
      'outcome',
      'status',
      'warning_reason',
    ]);
    expect(options).toEqual({
      defaultSearchOperator: 'AND',
      ruleTypeIds: ['foo'],
      consumers: ['bar'],
    });
    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows aggregating rule health', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    ruleHealthRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.aggregate.mockResolvedValueOnce(aggregateResult);

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: {} });

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents aggregating rule health', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    ruleHealthRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: {} }, ['ok']);

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);
  });
});
