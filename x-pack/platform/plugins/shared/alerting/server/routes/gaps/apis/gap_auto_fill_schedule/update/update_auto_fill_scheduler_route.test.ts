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
  updateAutoFillSchedulerRoute,
  updateAutoFillSchedulerPublicRoute,
} from './update_auto_fill_scheduler_route';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

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
  const excludedReasons = [gapReasonType.RULE_DISABLED];

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
        excluded_reasons: excludedReasons,
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
    expect(config.validate).toEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          body: expect.anything(),
          params: expect.anything(),
        }),
      })
    );
  });
});

describe('updateAutoFillSchedulerPublicRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockUpdateRequest = {
    name: '',
    enabled: false,
    schedule: { interval: '2m' },
    gap_fill_range: 'now-90d',
    max_backfills: 100,
    num_retries: 3,
    scope: ['security_solution'],
    rule_types: [{ type: 'siem.queryRule', consumer: 'siem' }],
  };

  const mockUpdateResponse = {
    id: 'security-solution-gap-auto-fill-scheduler-default',
    name: '',
    enabled: false,
    schedule: { interval: '2m' },
    gapFillRange: 'now-90d',
    maxBackfills: 100,
    numRetries: 3,
    scope: ['security_solution'],
    ruleTypes: [{ type: 'siem.queryRule', consumer: 'siem' }],
    createdBy: 'user',
    updatedBy: 'user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  };

  test('registers a public route with the public path and OAS options', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerPublicRoute(router, licenseState);

    const [config] = router.put.mock.calls[0];
    expect(config.path).toEqual('/api/alerting/rules/gaps/auto_fill_scheduler/{id}');
    expect(config.options).toEqual(
      expect.objectContaining({
        access: 'public',
        summary: 'Update a gap auto fill scheduler by ID',
        tags: ['oas-tag:alerting'],
      })
    );
    expect(config.options?.description).toEqual(expect.any(String));
    expect(config.options?.oasOperationObject).toEqual(expect.any(Function));
    expect(config.security).toEqual(DEFAULT_ALERTING_ROUTE_SECURITY);
    expect(config.validate).toEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          body: expect.anything(),
          params: expect.anything(),
        }),
        response: expect.objectContaining({
          200: expect.anything(),
        }),
      })
    );
  });

  test('calls update gap auto fill scheduler and returns the public response', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerPublicRoute(router, licenseState);

    rulesClient.updateGapAutoFillScheduler.mockResolvedValueOnce(mockUpdateResponse);
    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'security-solution-gap-auto-fill-scheduler-default' },
        body: mockUpdateRequest,
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
    expect(licenseState.ensureLicenseForGapAutoFillScheduler).toHaveBeenCalled();
    expect(rulesClient.updateGapAutoFillScheduler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'security-solution-gap-auto-fill-scheduler-default',
        enabled: false,
        gapFillRange: 'now-90d',
        ruleTypes: [{ type: 'siem.queryRule', consumer: 'siem' }],
      })
    );
    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: 'security-solution-gap-auto-fill-scheduler-default',
        name: '',
        enabled: false,
        schedule: { interval: '2m' },
        gap_fill_range: 'now-90d',
        max_backfills: 100,
        num_retries: 3,
        scope: ['security_solution'],
        rule_types: [{ type: 'siem.queryRule', consumer: 'siem' }],
        excluded_reasons: [gapReasonType.RULE_DISABLED],
        created_by: 'user',
        updated_by: 'user',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
      },
    });
  });

  test('respects license failures', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateAutoFillSchedulerPublicRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.put.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'security-solution-gap-auto-fill-scheduler-default' },
        body: mockUpdateRequest,
      }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
    expect(rulesClient.updateGapAutoFillScheduler).not.toHaveBeenCalled();
  });
});
