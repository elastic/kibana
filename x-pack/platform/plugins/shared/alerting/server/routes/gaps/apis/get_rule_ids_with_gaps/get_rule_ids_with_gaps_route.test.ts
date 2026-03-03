/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { getRuleIdsWithGapsRoute } from './get_rule_ids_with_gaps_route';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('getRuleIdsWithGapsRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockBody = {
    start: '2023-11-16T08:00:00.000Z',
    end: '2023-11-17T08:00:00.000Z',
  };

  const mockResult = {
    total: 1,
    ruleIds: ['rule-1'],
    summary: {
      totalUnfilledDurationMs: 1000,
      totalInProgressDurationMs: 0,
      totalFilledDurationMs: 0,
      totalDurationMs: 1000,
      rulesByGapFillStatus: {
        unfilled: 1,
        inProgress: 0,
        filled: 0,
      },
    },
  };

  const mockResultWithSummary = {
    total: 2,
    ruleIds: ['rule-1', 'rule-2'],
    latestGapTimestamp: 1704067200000,
    summary: {
      totalUnfilledDurationMs: 3600000,
      totalInProgressDurationMs: 1800000,
      totalFilledDurationMs: 900000,
      totalDurationMs: 6300000,
      rulesByGapFillStatus: {
        unfilled: 1,
        inProgress: 1,
        filled: 0,
      },
    },
  };

  test('should get rules with gaps with the proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleIdsWithGapsRoute(router, licenseState);

    rulesClient.getRuleIdsWithGaps.mockResolvedValueOnce(mockResult);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockBody });

    expect(config.path).toEqual('/internal/alerting/rules/gaps/_get_rules');

    await handler(context, req, res);

    expect(rulesClient.getRuleIdsWithGaps).toHaveBeenLastCalledWith(mockBody);
    expect(res.ok).toHaveBeenLastCalledWith({
      body: {
        total: 1,
        rule_ids: ['rule-1'],
        summary: {
          total_unfilled_duration_ms: 1000,
          total_in_progress_duration_ms: 0,
          total_filled_duration_ms: 0,
          total_duration_ms: 1000,
          rules_by_gap_fill_status: {
            unfilled: 1,
            in_progress: 0,
            filled: 0,
          },
        },
      },
    });
  });

  test('ensures the license allows for getting rules with gaps', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleIdsWithGapsRoute(router, licenseState);

    rulesClient.getRuleIdsWithGaps.mockResolvedValueOnce(mockResult);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockBody });
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents getting rules with gaps when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleIdsWithGapsRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockBody });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  test('should transform response with summary correctly', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleIdsWithGapsRoute(router, licenseState);

    rulesClient.getRuleIdsWithGaps.mockResolvedValueOnce(mockResultWithSummary);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockBody });

    await handler(context, req, res);

    expect(res.ok).toHaveBeenLastCalledWith({
      body: {
        total: 2,
        rule_ids: ['rule-1', 'rule-2'],
        latest_gap_timestamp: 1704067200000,
        summary: {
          total_unfilled_duration_ms: 3600000,
          total_in_progress_duration_ms: 1800000,
          total_filled_duration_ms: 900000,
          total_duration_ms: 6300000,
          rules_by_gap_fill_status: {
            unfilled: 1,
            in_progress: 1,
            filled: 0,
          },
        },
      },
    });
  });
});
