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
import {
  deleteAutoFillSchedulerRoute,
  deleteAutoFillSchedulerPublicRoute,
} from './delete_auto_fill_scheduler_route';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('deleteAutoFillSchedulerRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should call delete gap fill auto scheduler with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteAutoFillSchedulerRoute(router, licenseState);

    const [config, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'test-scheduler-id' } },
      ['noContent']
    );

    expect(config.path).toEqual('/internal/alerting/rules/gaps/auto_fill_scheduler/{id}');

    await handler(context, req, res);

    expect(rulesClient.deleteGapAutoFillScheduler).toHaveBeenCalledWith({
      id: 'test-scheduler-id',
    });

    expect(res.noContent).toHaveBeenCalled();
  });

  test('ensures the license allows for deleting gap fill auto scheduler', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.deleteGapAutoFillScheduler = jest.fn();

    deleteAutoFillSchedulerRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'test-scheduler-id' } }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
    expect(licenseState.ensureLicenseForGapAutoFillScheduler).toHaveBeenCalled();
  });

  test('ensures the license check prevents deleting gap fill auto scheduler when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.deleteGapAutoFillScheduler = jest.fn();

    deleteAutoFillSchedulerRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'test-scheduler-id' } }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
  });

  test('handles validation for params', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteAutoFillSchedulerRoute(router, licenseState);

    const [config] = router.delete.mock.calls[0];
    expect(config.validate).toEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          params: expect.anything(),
        }),
      })
    );
  });
});

describe('deleteAutoFillSchedulerPublicRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('registers a public route with the public path and OAS options', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteAutoFillSchedulerPublicRoute(router, licenseState);

    const [config] = router.delete.mock.calls[0];
    expect(config.path).toEqual('/api/alerting/rules/gaps/auto_fill_scheduler/{id}');
    expect(config.options).toEqual(
      expect.objectContaining({
        access: 'public',
        summary: 'Delete a gap auto fill scheduler by ID',
        tags: ['oas-tag:alerting'],
      })
    );
    expect(config.security).toEqual(DEFAULT_ALERTING_ROUTE_SECURITY);
    expect(config.validate).toEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          params: expect.anything(),
        }),
        response: expect.objectContaining({
          204: expect.anything(),
        }),
      })
    );
  });

  test('calls delete gap auto fill scheduler and returns no content', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteAutoFillSchedulerPublicRoute(router, licenseState);

    rulesClient.deleteGapAutoFillScheduler.mockResolvedValueOnce();
    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'security-solution-gap-auto-fill-scheduler-default' } },
      ['noContent']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
    expect(licenseState.ensureLicenseForGapAutoFillScheduler).toHaveBeenCalled();
    expect(rulesClient.deleteGapAutoFillScheduler).toHaveBeenCalledWith({
      id: 'security-solution-gap-auto-fill-scheduler-default',
    });
    expect(res.noContent).toHaveBeenCalled();
  });

  test('respects license failures', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteAutoFillSchedulerPublicRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('License check failed');
    });
    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'security-solution-gap-auto-fill-scheduler-default' } }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: License check failed]`
    );
    expect(rulesClient.deleteGapAutoFillScheduler).not.toHaveBeenCalled();
  });
});
