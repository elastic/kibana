/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { getBackfillRoute } from './get_backfill_route';
import { Backfill } from '../../../../application/backfill/result/types';
import { transformBackfillToBackfillResponseV1 } from '../../transforms';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('getBackfillRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockBackfillResult: Backfill = {
    id: 'abc',
    createdAt: '2024-01-30T00:00:00.000Z',
    duration: '12h',
    enabled: true,
    rule: {
      name: 'my rule name',
      tags: ['foo'],
      alertTypeId: 'myType',
      params: {},
      apiKeyOwner: 'user',
      apiKeyCreatedByUser: false,
      consumer: 'myApp',
      enabled: true,
      schedule: { interval: '12h' },
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: '2019-02-12T21:01:22.479Z',
      updatedAt: '2019-02-12T21:01:22.479Z',
      revision: 0,
      id: '1',
    },
    spaceId: 'default',
    start: '2023-11-16T08:00:00.000Z',
    status: 'pending',
    schedule: [{ runAt: '2023-11-16T20:00:00.000Z', interval: '12h', status: 'pending' }],
  };

  test('should get the backfill', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getBackfillRoute(router, licenseState);

    rulesClient.getBackfill.mockResolvedValueOnce(mockBackfillResult);
    const [config, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: { id: 'abc' } });

    expect(config.path).toEqual('/internal/alerting/rules/backfill/{id}');

    await handler(context, req, res);

    expect(rulesClient.getBackfill).toHaveBeenLastCalledWith('abc');
    expect(res.ok).toHaveBeenLastCalledWith({
      body: transformBackfillToBackfillResponseV1(mockBackfillResult),
    });
  });

  test('ensures the license allows for getting the backfill', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getBackfillRoute(router, licenseState);

    rulesClient.getBackfill.mockResolvedValueOnce(mockBackfillResult);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: { id: 'abc' } });

    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for getting the backfill when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getBackfillRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: { id: 'abc' } });

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
