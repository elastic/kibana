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
import { gapReasonType } from '../../../../../../common/constants/gap_reason';
import {
  getAutoFillSchedulerRoute,
  getAutoFillSchedulerPublicRoute,
} from './get_auto_fill_scheduler_route';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

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
    gapFillRange: '24h',
    maxBackfills: 100,
    numRetries: 3,
    createdBy: 'test-user',
    updatedBy: 'test-user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    scheduledTaskId: 'task-id',
    scope: ['test-space'],
    ruleTypes: [{ type: 'test-type', consumer: 'test-consumer' }],
  };
  const excludedReasons = [gapReasonType.RULE_DISABLED];

  test('should call get gap fill auto scheduler with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    rulesClient.getGapAutoFillScheduler.mockResolvedValueOnce(mockGetResponse);
    const [config, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'test-scheduler-id' } },
      ['ok']
    );

    expect(config.path).toEqual('/internal/alerting/rules/gaps/auto_fill_scheduler/{id}');

    await handler(context, req, res);

    expect(rulesClient.getGapAutoFillScheduler).toHaveBeenCalledWith({ id: 'test-scheduler-id' });

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: 'test-scheduler-id',
        name: 'Test Scheduler',
        enabled: true,
        schedule: { interval: '1h' },
        gap_fill_range: '24h',
        max_backfills: 100,
        num_retries: 3,
        excluded_reasons: excludedReasons,
        scope: ['test-space'],
        rule_types: [{ type: 'test-type', consumer: 'test-consumer' }],
        created_by: 'test-user',
        updated_by: 'test-user',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    });
  });

  test('ensures the license allows for getting gap fill auto scheduler', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    rulesClient.getGapAutoFillScheduler.mockResolvedValueOnce(mockGetResponse);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'test-scheduler-id' } }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
    expect(licenseState.ensureLicenseForGapAutoFillScheduler).toHaveBeenCalled();
  });

  test('ensures the license check prevents getting gap fill auto scheduler when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'test-scheduler-id' } }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
  });
});

describe('getAutoFillSchedulerPublicRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockGetResponse = {
    id: 'security-solution-gap-auto-fill-scheduler-default',
    name: '',
    enabled: true,
    schedule: { interval: '2m' },
    gapFillRange: 'now-90d',
    maxBackfills: 100,
    numRetries: 3,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    scheduledTaskId: 'task-id',
    scope: ['security_solution'],
    ruleTypes: [{ type: 'siem.queryRule', consumer: 'siem' }],
    excludedReasons: [gapReasonType.RULE_DISABLED],
  };

  test('registers a public route with the public path and OAS options', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerPublicRoute(router, licenseState);

    const [config] = router.get.mock.calls[0];
    expect(config.path).toEqual('/api/alerting/rules/gaps/auto_fill_scheduler/{id}');
    expect(config.options).toEqual(
      expect.objectContaining({
        access: 'public',
        summary: 'Get a gap auto fill scheduler by ID',
        tags: ['oas-tag:alerting'],
      })
    );
    expect(config.options?.description).toEqual(expect.any(String));
    expect(config.options?.oasOperationObject).toEqual(expect.any(Function));
    expect(config.security).toEqual(DEFAULT_ALERTING_ROUTE_SECURITY);
    expect(config.validate).toEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          params: expect.anything(),
        }),
        response: expect.objectContaining({
          200: expect.anything(),
        }),
      })
    );
  });

  test('calls get gap auto fill scheduler and returns the public response', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerPublicRoute(router, licenseState);

    rulesClient.getGapAutoFillScheduler.mockResolvedValueOnce(mockGetResponse);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'security-solution-gap-auto-fill-scheduler-default' } },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
    expect(licenseState.ensureLicenseForGapAutoFillScheduler).toHaveBeenCalled();
    expect(rulesClient.getGapAutoFillScheduler).toHaveBeenCalledWith({
      id: 'security-solution-gap-auto-fill-scheduler-default',
    });
    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: 'security-solution-gap-auto-fill-scheduler-default',
        name: '',
        enabled: true,
        schedule: { interval: '2m' },
        gap_fill_range: 'now-90d',
        max_backfills: 100,
        num_retries: 3,
        scope: ['security_solution'],
        rule_types: [{ type: 'siem.queryRule', consumer: 'siem' }],
        excluded_reasons: [gapReasonType.RULE_DISABLED],
        created_by: 'elastic',
        updated_by: 'elastic',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
    });
  });

  test('respects license failures', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAutoFillSchedulerPublicRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'security-solution-gap-auto-fill-scheduler-default' } }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
    expect(rulesClient.getGapAutoFillScheduler).not.toHaveBeenCalled();
  });
});
