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
import { createAutoFillSchedulerRoute } from './create_auto_fill_scheduler_route';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('createAutoFillSchedulerRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockCreateRequest = {
    id: 'test-scheduler-id',
    name: 'Test Scheduler',
    enabled: true,
    schedule: { interval: '1h' },
    gap_fill_range: '24h',
    max_backfills: 100,
    num_retries: 3,
    scope: ['internal'],
    rule_types: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
  };

  const mockCreateResponse = {
    id: 'test-scheduler-id',
    name: 'Test Scheduler',
    enabled: true,
    schedule: { interval: '1h' },
    gapFillRange: '24h',
    maxBackfills: 100,
    numRetries: 3,
    createdBy: 'test-user',
    updatedBy: 'test-user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    scheduledTaskId: 'task-id',
    scope: ['internal'],
    ruleTypes: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
  };

  test('should call create gap fill auto scheduler with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createAutoFillSchedulerRoute(router, licenseState);

    rulesClient.createGapAutoFillScheduler.mockResolvedValueOnce(mockCreateResponse);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockCreateRequest });

    expect(config.path).toEqual('/internal/alerting/rules/gaps/auto_fill_scheduler');

    await handler(context, req, res);

    expect(rulesClient.createGapAutoFillScheduler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-scheduler-id',
        name: 'Test Scheduler',
        enabled: true,
        schedule: { interval: '1h' },
        gapFillRange: '24h',
        maxBackfills: 100,
        numRetries: 3,
        scope: ['internal'],
        ruleTypes: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
        request: expect.any(Object),
      })
    );

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: 'test-scheduler-id',
        name: 'Test Scheduler',
        enabled: true,
        schedule: { interval: '1h' },
        gap_fill_range: '24h',
        max_backfills: 100,
        scope: ['internal'],
        rule_types: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
        num_retries: 3,
        created_by: 'test-user',
        updated_by: 'test-user',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    });
  });

  test('ensures the license allows for creating gap fill auto scheduler', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createAutoFillSchedulerRoute(router, licenseState);

    rulesClient.createGapAutoFillScheduler.mockResolvedValueOnce(mockCreateResponse);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockCreateRequest });
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
    expect(licenseState.ensureLicenseForGapAutoFillScheduler).toHaveBeenCalled();
  });

  test('ensures the license check prevents creating gap fill auto scheduler when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createAutoFillSchedulerRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockCreateRequest });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
  });

  test('handles validation errors', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createAutoFillSchedulerRoute(router, licenseState);

    const [config] = router.post.mock.calls[0];
    expect(config.validate).toBeDefined();
    if (
      config.validate &&
      typeof config.validate !== 'boolean' &&
      typeof config.validate !== 'function'
    ) {
      expect(config.validate.body).toBeDefined();
    }
  });
});
