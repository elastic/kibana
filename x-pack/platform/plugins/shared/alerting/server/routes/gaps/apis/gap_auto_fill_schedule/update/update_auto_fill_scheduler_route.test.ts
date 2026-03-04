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
  });

  const mockUpdateRequest = {
    name: 'Updated Scheduler',
    enabled: false,
    schedule: { interval: '30m' },
    gap_fill_range: 'now-30d',
    max_backfills: 50,
    num_retries: 2,
    scope: ['scope-a'],
    rule_types: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
  };

  const mockUpdateResponse = {
    id: 'test-scheduler-id',
    name: 'Updated Scheduler',
    enabled: false,
    schedule: { interval: '30m' },
    gapFillRange: 'now-30d',
    maxBackfills: 50,
    numRetries: 2,
    scope: ['scope-a'],
    ruleTypes: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
    createdBy: 'user',
    updatedBy: 'user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  };

  test('calls update gap auto fill scheduler with transformed params', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    rulesClient.updateGapAutoFillScheduler.mockResolvedValueOnce(mockUpdateResponse);
    const [config, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'test-scheduler-id' },
        body: mockUpdateRequest,
      }
    );

    expect(config.path).toEqual('/internal/alerting/rules/gaps/auto_fill_scheduler/{id}');

    await handler(context, req, res);

    expect(rulesClient.updateGapAutoFillScheduler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-scheduler-id',
        name: 'Updated Scheduler',
        enabled: false,
        schedule: { interval: '30m' },
        gapFillRange: 'now-30d',
        maxBackfills: 50,
        numRetries: 2,
        scope: ['scope-a'],
        ruleTypes: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
        request: expect.any(Object),
      })
    );

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: 'test-scheduler-id',
        name: 'Updated Scheduler',
        enabled: false,
        schedule: { interval: '30m' },
        gap_fill_range: 'now-30d',
        max_backfills: 50,
        num_retries: 2,
        created_by: 'user',
        updated_by: 'user',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        scope: ['scope-a'],
        rule_types: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
      },
    });
  });

  test('ensures the license allows for updating gap auto fill scheduler', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    rulesClient.updateGapAutoFillScheduler.mockResolvedValueOnce(mockUpdateResponse);
    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'test-scheduler-id' },
        body: mockUpdateRequest,
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
    expect(licenseState.ensureLicenseForGapAutoFillScheduler).toHaveBeenCalled();
  });

  test('respects license failures', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    (licenseState.ensureLicenseForGapAutoFillScheduler as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'test-scheduler-id' },
        body: mockUpdateRequest,
      }
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
  });

  test('includes validation schemas', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerRoute(router, licenseState);

    const [config] = router.put.mock.calls[0];
    expect(config.validate).toBeDefined();
    if (
      config.validate &&
      typeof config.validate !== 'boolean' &&
      typeof config.validate !== 'function'
    ) {
      expect(config.validate.body).toBeDefined();
      expect(config.validate.params).toBeDefined();
    }
  });
});
