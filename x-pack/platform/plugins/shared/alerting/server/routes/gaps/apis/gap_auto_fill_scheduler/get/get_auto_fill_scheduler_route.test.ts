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
import { getAutoFillSchedulerRoute } from './get_auto_fill_scheduler_route';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('getAutoFillSchedulerRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockGetResponse = {
    id: 'test-scheduler-id',
    name: 'Test Scheduler',
    enabled: true,
    schedule: { interval: '1h' },
    rulesFilter: '{}',
    gapFillRange: '24h',
    maxAmountOfGapsToProcessPerRun: 100,
    maxAmountOfRulesToProcessPerRun: 50,
    amountOfRetries: 3,
    createdBy: 'test-user',
    updatedBy: 'test-user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    scheduledTaskId: 'task-id',
  };

  test('should call get gap fill auto scheduler with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    rulesClient.getGapFillAutoScheduler.mockResolvedValueOnce(mockGetResponse);
    const [config, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, {}, ['ok']);
    req.params = { id: 'test-scheduler-id' };

    expect(config.path).toEqual('/internal/alerting/rules/gaps/gap_auto_fill_scheduler/{id}');

    await handler(context, req, res);

    expect(rulesClient.getGapFillAutoScheduler).toHaveBeenCalledWith({ id: 'test-scheduler-id' });

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: 'test-scheduler-id',
        name: 'Test Scheduler',
        enabled: true,
        schedule: { interval: '1h' },
        rules_filter: '{}',
        gap_fill_range: '24h',
        max_amount_of_gaps_to_process_per_run: 100,
        max_amount_of_rules_to_process_per_run: 50,
        amount_of_retries: 3,
        created_by: 'test-user',
        updated_by: 'test-user',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        scheduled_task_id: 'task-id',
      },
    });
  });

  test('should return 404 when scheduler not found', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    const error = new Error('Not found');
    error.output = { statusCode: 404 };
    rulesClient.getGapFillAutoScheduler.mockRejectedValueOnce(error);

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, {}, ['notFound']);
    req.params = { id: 'non-existent-id' };

    await handler(context, req, res);

    expect(res.notFound).toHaveBeenCalledWith({
      body: { message: 'Scheduler with id non-existent-id not found' },
    });
  });

  test('should return 500 for other errors', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    const error = new Error('Internal error');
    rulesClient.getGapFillAutoScheduler.mockRejectedValueOnce(error);

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, {}, ['customError']);
    req.params = { id: 'test-scheduler-id' };

    await handler(context, req, res);

    expect(res.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Internal error' },
    });
  });

  test('ensures the license allows for getting gap fill auto scheduler', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    rulesClient.getGapFillAutoScheduler.mockResolvedValueOnce(mockGetResponse);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, {});
    req.params = { id: 'test-scheduler-id' };
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents getting gap fill auto scheduler when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, {});
    req.params = { id: 'test-scheduler-id' };
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
  });

  test('validates route parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    const [config] = router.get.mock.calls[0];
    expect(config.validate?.params).toBeDefined();
  });
});
