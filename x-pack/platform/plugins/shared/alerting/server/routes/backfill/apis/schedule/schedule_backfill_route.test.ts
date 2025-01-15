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
import { transformRequestV1, transformResponseV1 } from './transforms';
import { rulesClientMock } from '../../../../rules_client.mock';
import { scheduleBackfillRoute } from './schedule_backfill_route';
import { ScheduleBackfillResults } from '../../../../application/backfill/methods/schedule/types';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('scheduleBackfillRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockScheduleOptions = [
    {
      rule_id: 'abc',
      start: '2023-11-16T08:00:00.000Z',
      end: '2023-11-16T08:20:00.000Z',
    },
  ];

  const mockBackfillResult: ScheduleBackfillResults = [
    {
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
    },
    {
      id: 'def',
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
        id: '2',
      },
      spaceId: 'default',
      start: '2023-11-16T08:00:00.000Z',
      status: 'pending',
      schedule: [
        { runAt: '2023-11-16T20:00:00.000Z', interval: '12h', status: 'pending' },
        { runAt: '2023-11-17T08:00:00.000Z', interval: '12h', status: 'pending' },
      ],
    },
  ];

  test('should schedule the backfill', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    scheduleBackfillRoute(router, licenseState);

    rulesClient.scheduleBackfill.mockResolvedValueOnce(mockBackfillResult);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { body: mockScheduleOptions }
    );

    expect(config.path).toEqual('/internal/alerting/rules/backfill/_schedule');

    await handler(context, req, res);

    expect(rulesClient.scheduleBackfill).toHaveBeenLastCalledWith(
      transformRequestV1(mockScheduleOptions)
    );
    expect(res.ok).toHaveBeenLastCalledWith({
      body: transformResponseV1(mockBackfillResult),
    });
  });

  test('ensures the license allows for scheduling the backfill', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    scheduleBackfillRoute(router, licenseState);

    rulesClient.scheduleBackfill.mockResolvedValueOnce(mockBackfillResult);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { body: mockScheduleOptions }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for scheduling the backfill when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    scheduleBackfillRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { body: mockScheduleOptions }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
