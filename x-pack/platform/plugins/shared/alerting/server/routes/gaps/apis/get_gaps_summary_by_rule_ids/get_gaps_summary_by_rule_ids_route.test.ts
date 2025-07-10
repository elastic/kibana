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
import { getGapsSummaryByRuleIdsRoute } from './get_gaps_summary_by_rule_ids_route';

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const rulesClient = rulesClientMock.create();

describe('getGapsSummaryByRuleIdsRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockBody = {
    start: '2023-11-16T08:00:00.000Z',
    end: '2023-11-17T08:00:00.000Z',
    rule_ids: ['rule-1', 'rule-2'],
  };

  const mockResult = {
    data: [
      {
        ruleId: 'rule-1',
        totalUnfilledDurationMs: 3600000,
        totalInProgressDurationMs: 0,
        totalFilledDurationMs: 82800000,
      },
    ],
  };

  test('should get gaps info by rule ids with the proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.getGapsSummaryByRuleIds.mockResolvedValueOnce(mockResult);
    getGapsSummaryByRuleIdsRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockBody });

    expect(config.path).toEqual('/internal/alerting/rules/gaps/_get_gaps_summary_by_rule_ids');

    await handler(context, req, res);

    expect(rulesClient.getGapsSummaryByRuleIds).toHaveBeenLastCalledWith({
      start: mockBody.start,
      end: mockBody.end,
      ruleIds: mockBody.rule_ids,
    });
    expect(res.ok).toHaveBeenLastCalledWith({
      body: {
        data: [
          {
            rule_id: 'rule-1',
            total_unfilled_duration_ms: 3600000,
            total_in_progress_duration_ms: 0,
            total_filled_duration_ms: 82800000,
          },
        ],
      },
    });
  });

  test('ensures the license allows for getting gaps info', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.getGapsSummaryByRuleIds.mockResolvedValueOnce(mockResult);
    getGapsSummaryByRuleIdsRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockBody });
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents getting gaps info when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getGapsSummaryByRuleIdsRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockBody });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
