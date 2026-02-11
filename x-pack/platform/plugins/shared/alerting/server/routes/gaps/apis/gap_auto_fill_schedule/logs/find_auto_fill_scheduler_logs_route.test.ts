/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../../rules_client.mock';
import { findAutoFillSchedulerLogsRoute } from './find_auto_fill_scheduler_logs_route';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('findAutoFillSchedulerLogsRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockGetLogsResponse = {
    data: [
      {
        id: 'test-log-id',
        timestamp: '2024-01-01T00:00:00.000Z',
        status: 'success',
        message: 'Gap fill auto scheduler logs',
        results: [
          {
            ruleId: 'test-rule-id',
            processedGaps: 10,
            status: 'success',
          },
        ],
      },
    ],
    total: 1,
    page: 1,
    perPage: 10,
  };

  test('should call get gap auto fill scheduler logs with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    findAutoFillSchedulerLogsRoute(router, licenseState);
    rulesClient.findGapAutoFillSchedulerLogs.mockResolvedValueOnce(mockGetLogsResponse);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'test-scheduler-id' },
        body: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:00.000Z',
          page: 1,
          per_page: 10,
          sort_field: '@timestamp',
          sort_direction: 'desc',
          statuses: ['success'],
        },
      },
      ['ok']
    );
    expect(config.path).toEqual('/internal/alerting/rules/gaps/auto_fill_scheduler/{id}/logs');
    await handler(context, req, res);
    expect(rulesClient.findGapAutoFillSchedulerLogs).toHaveBeenCalledWith({
      id: 'test-scheduler-id',
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-01T00:00:00.000Z',
      page: 1,
      perPage: 10,
      sortField: '@timestamp',
      sortDirection: 'desc',
      statuses: ['success'],
    });
    expect(res.ok).toHaveBeenCalledWith({
      body: {
        data: [
          {
            id: 'test-log-id',
            timestamp: '2024-01-01T00:00:00.000Z',
            status: 'success',
            message: 'Gap fill auto scheduler logs',
            results: [
              {
                rule_id: 'test-rule-id',
                processed_gaps: 10,
                status: 'success',
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
      },
    });
  });

  test('ensures the license allows for getting gap auto fill scheduler logs', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    rulesClient.findGapAutoFillSchedulerLogs.mockResolvedValueOnce(mockGetLogsResponse);
    findAutoFillSchedulerLogsRoute(router, licenseState);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'test-scheduler-id' },
        body: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:00.000Z',
          page: 1,
          per_page: 10,
          sort_field: '@timestamp',
          sort_direction: 'desc',
          statuses: ['success'],
        },
      }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
    expect(licenseState.ensureLicenseForGapAutoFillScheduler).toHaveBeenCalled();
  });

  test('ensures the license check prevents getting gap auto fill scheduler logs when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    findAutoFillSchedulerLogsRoute(router, licenseState);
    const [, handler] = router.post.mock.calls[0];
    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'test-scheduler-id' } }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
  });
});
