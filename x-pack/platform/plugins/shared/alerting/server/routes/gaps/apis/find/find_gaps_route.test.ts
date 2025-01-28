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
import { findGapsRoute } from './find_gaps_route';
import { Gap } from '../../../../lib/rule_gaps/gap';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('findGapsRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockFindOptions = {
    rule_id: 'abc',
    start: '2023-11-16T08:00:00.000Z',
    end: '2023-11-17T08:00:00.000Z',
    page: 1,
    per_page: 10,
  };

  const createMockGap = () => {
    const gap = new Gap({
      timestamp: '2024-01-30T00:00:00.000Z',
      range: {
        gte: '2023-11-16T08:00:00.000Z',
        lte: '2023-11-16T20:00:00.000Z',
      },
      internalFields: {
        _id: 'gap-1',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    });
    return gap;
  };

  const mockFindResult = {
    page: 1,
    perPage: 10,
    total: 1,
    data: [createMockGap()],
  };

  test('should find gaps with the proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findGapsRoute(router, licenseState);

    rulesClient.findGaps.mockResolvedValueOnce(mockFindResult);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockFindOptions });

    expect(config.path).toEqual('/internal/alerting/rules/gaps/_find');

    await handler(context, req, res);

    expect(rulesClient.findGaps).toHaveBeenLastCalledWith({
      ruleId: 'abc',
      start: '2023-11-16T08:00:00.000Z',
      end: '2023-11-17T08:00:00.000Z',
      page: 1,
      perPage: 10,
    });
    expect(res.ok).toHaveBeenLastCalledWith({
      body: {
        page: 1,
        per_page: 10,
        total: 1,
        data: [
          {
            _id: 'gap-1',
            '@timestamp': '2024-01-30T00:00:00.000Z',
            status: 'unfilled',
            range: {
              gte: '2023-11-16T08:00:00.000Z',
              lte: '2023-11-16T20:00:00.000Z',
            },
            total_gap_duration_ms: 43200000,
            unfilled_duration_ms: 43200000,
            filled_duration_ms: 0,
            in_progress_duration_ms: 0,
            unfilled_intervals: [
              {
                gte: '2023-11-16T08:00:00.000Z',
                lte: '2023-11-16T20:00:00.000Z',
              },
            ],
            filled_intervals: [],
            in_progress_intervals: [],
          },
        ],
      },
    });
  });

  test('ensures the license allows for finding gaps', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findGapsRoute(router, licenseState);

    rulesClient.findGaps.mockResolvedValueOnce(mockFindResult);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockFindOptions });
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents finding gaps when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findGapsRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockFindOptions });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
