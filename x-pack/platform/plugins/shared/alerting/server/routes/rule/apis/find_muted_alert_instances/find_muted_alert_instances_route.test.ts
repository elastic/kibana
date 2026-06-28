/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { findMutedAlertInstancesRoute } from './find_muted_alert_instances_route';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import type { FindMutedAlertsResult } from '../../../../application/rule/methods/find_muted_alerts';

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

const rulesClient = rulesClientMock.create();

describe('findMutedAlertInstancesRoute', () => {
  it('registers the route as internal (not public)', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findMutedAlertInstancesRoute(router, licenseState);

    const [config] = router.post.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/_find_muted_alerts"`);
    expect(config.options).toEqual(expect.objectContaining({ access: 'internal' }));
  });

  it('transforms the request body and returns only id + muted_alert_ids', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findMutedAlertInstancesRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const findResult: FindMutedAlertsResult = {
      page: 1,
      perPage: 10,
      total: 1,
      data: [{ id: 'rule-1', mutedInstanceIds: ['instance-1', 'instance-2'] }],
    };
    rulesClient.findMutedAlerts.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: {
          per_page: 10,
          page: 1,
          filter: 'alert.id: alert:rule-1',
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.findMutedAlerts).toHaveBeenCalledTimes(1);
    expect(rulesClient.findMutedAlerts.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "options": Object {
            "filter": "alert.id: alert:rule-1",
            "page": 1,
            "perPage": 10,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        page: 1,
        per_page: 10,
        total: 1,
        data: [{ id: 'rule-1', muted_alert_ids: ['instance-1', 'instance-2'] }],
      },
    });
  });

  it('omits optional options that are not provided in the body', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findMutedAlertInstancesRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.findMutedAlerts.mockResolvedValueOnce({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: {} }, ['ok']);

    await handler(context, req, res);

    expect(rulesClient.findMutedAlerts.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "options": Object {},
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: { page: 1, per_page: 10, total: 0, data: [] },
    });
  });
});
