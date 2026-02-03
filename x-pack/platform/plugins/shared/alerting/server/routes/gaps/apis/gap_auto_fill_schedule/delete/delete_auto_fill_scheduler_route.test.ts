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
import { deleteAutoFillSchedulerRoute } from './delete_auto_fill_scheduler_route';

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
    expect(config.validate).toBeDefined();
    if (
      config.validate &&
      typeof config.validate !== 'boolean' &&
      typeof config.validate !== 'function'
    ) {
      expect(config.validate.params).toBeDefined();
    }
  });
});
