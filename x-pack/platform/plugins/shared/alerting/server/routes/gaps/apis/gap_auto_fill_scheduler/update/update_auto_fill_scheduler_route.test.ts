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
import { updateAutoFillSchedulerRoute } from './update_auto_fill_scheduler_route';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('updateAutoFillSchedulerRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Add the mock method if it doesn't exist
    if (!rulesClient.updateGapFillAutoScheduler) {
      rulesClient.updateGapFillAutoScheduler = jest.fn();
    }
  });

  const mockUpdateRequest = {
    name: 'Updated Test Scheduler',
    enabled: false,
    schedule: { interval: '2h' },
    rules_filter: { tags: ['test'] },
    gap_fill_range: '48h',
    max_amount_of_gaps_to_process_per_run: 200,
    max_amount_of_rules_to_process_per_run: 100,
    amount_of_retries: 5,
  };

  const mockUpdateResponse = {
    id: 'test-scheduler-id',
    name: 'Updated Test Scheduler',
    enabled: false,
    schedule: { interval: '2h' },
    rulesFilter: '{"tags":["test"]}',
    gapFillRange: '48h',
    maxAmountOfGapsToProcessPerRun: 200,
    maxAmountOfRulesToProcessPerRun: 100,
    amountOfRetries: 5,
    createdBy: 'test-user',
    updatedBy: 'test-user-2',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    lastRun: null,
    scheduledTaskId: 'task-id',
  };

  test('should update gap fill auto scheduler with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    rulesClient.updateGapFillAutoScheduler.mockResolvedValueOnce(mockUpdateResponse);
    const [config, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockUpdateRequest });
    req.params = { id: 'test-scheduler-id' };

    expect(config.path).toEqual('/internal/alerting/rules/gaps/gap_auto_fill_scheduler/{id}');

    await handler(context, req, res);

    expect(rulesClient.updateGapFillAutoScheduler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-scheduler-id',
        updates: expect.objectContaining({
          name: 'Updated Test Scheduler',
          enabled: false,
          schedule: { interval: '2h' },
          rulesFilter: { tags: ['test'] },
          gapFillRange: '48h',
          maxAmountOfGapsToProcessPerRun: 200,
          maxAmountOfRulesToProcessPerRun: 100,
          amountOfRetries: 5,
        }),
      })
    );

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: 'test-scheduler-id',
        name: 'Updated Test Scheduler',
        enabled: false,
        schedule: { interval: '2h' },
        rules_filter: '{"tags":["test"]}',
        gap_fill_range: '48h',
        max_amount_of_gaps_to_process_per_run: 200,
        max_amount_of_rules_to_process_per_run: 100,
        amount_of_retries: 5,
        created_by: 'test-user',
        updated_by: 'test-user-2',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        last_run: null,
        scheduled_task_id: 'task-id',
      },
    });
  });

  test('should return 404 when scheduler not found', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    const error = new Error('Not found');
    error.output = { statusCode: 404 };
    rulesClient.updateGapFillAutoScheduler.mockRejectedValueOnce(error);

    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockUpdateRequest }, [
      'notFound',
    ]);
    req.params = { id: 'non-existent-id' };

    await handler(context, req, res);

    expect(res.notFound).toHaveBeenCalledWith({
      body: { message: 'Scheduler with id non-existent-id not found' },
    });
  });

  test('should return 500 for other errors', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    const error = new Error('Internal error');
    rulesClient.updateGapFillAutoScheduler.mockRejectedValueOnce(error);

    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockUpdateRequest }, [
      'customError',
    ]);
    req.params = { id: 'test-scheduler-id' };

    await handler(context, req, res);

    expect(res.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Internal error' },
    });
  });

  test('ensures the license allows for updating gap fill auto scheduler', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    rulesClient.updateGapFillAutoScheduler.mockResolvedValueOnce(mockUpdateResponse);
    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockUpdateRequest });
    req.params = { id: 'test-scheduler-id' };
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents updating gap fill auto scheduler when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockUpdateRequest });
    req.params = { id: 'test-scheduler-id' };
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
  });

  test('validates route parameters and body', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    const [config] = router.put.mock.calls[0];
    expect(config.validate?.params).toBeDefined();
    expect(config.validate?.body).toBeDefined();
  });
});
