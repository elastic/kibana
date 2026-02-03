/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { bulkMuteAlertsRoute } from './bulk_mute_alerts_route';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../lib/errors/rule_type_disabled';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { validateMaxMuteUnmuteInstancesV1 } from '../../validation';
import type { BulkMuteUnmuteAlertsRequestBodyV1 } from '../../../../../common/routes/rule/apis/bulk_mute_unmute';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('../../validation', () => ({
  validateMaxMuteUnmuteInstancesV1: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('bulkMuteAlertsRoute', () => {
  const bulkMuteRequest: BulkMuteUnmuteAlertsRequestBodyV1 = {
    rules: [
      {
        rule_id: 'test-rule-id',
        alert_instance_ids: ['test-instance-id'],
      },
    ],
  };
  const transformedMuteRequest = {
    id: 'test-rule-id',
    alertInstanceIds: ['test-instance-id'],
  };

  it('should mute alerts with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkMuteAlertsRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toBe('/internal/alerting/alerts/_bulk_mute');

    rulesClient.bulkMuteInstances.mockResolvedValueOnce(undefined);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkMuteRequest,
      },
      ['noContent']
    );

    await handler(context, req, res);

    expect(validateMaxMuteUnmuteInstancesV1).toHaveBeenCalledTimes(1);
    expect(validateMaxMuteUnmuteInstancesV1).toHaveBeenCalledWith(bulkMuteRequest);

    expect(rulesClient.bulkMuteInstances).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkMuteInstances).toHaveBeenCalledWith({
      rules: [transformedMuteRequest],
    });

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the license allows bulk muting alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.bulkMuteInstances.mockResolvedValueOnce(undefined);

    bulkMuteAlertsRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkMuteRequest,
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents bulk muting alerts', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });

    bulkMuteAlertsRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkMuteRequest,
      }
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkMuteAlertsRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.bulkMuteInstances.mockRejectedValue(
      new RuleTypeDisabledError('Fail', 'license_invalid')
    );

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: {}, body: bulkMuteRequest },
      ['noContent', 'forbidden']
    );

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
