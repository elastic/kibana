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
import { fillGapByIdRoute } from './fill_gap_by_id_route';
import { ScheduleBackfillResults } from '../../../../application/backfill/methods/schedule/types';

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('fillGapByIdRoute', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient = rulesClientMock.create();
  });

  const mockQuery = {
    gap_id: 'gap-1',
    rule_id: 'rule-1',
  };

  const mockResult: ScheduleBackfillResults = [
    {
      id: 'backfill-1',
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
        id: 'rule-1',
        actions: [],
      },
      spaceId: 'default',
      start: '2023-11-16T08:00:00.000Z',
      status: 'pending',
      schedule: [{ runAt: '2023-11-16T20:00:00.000Z', interval: '12h', status: 'pending' }],
    },
  ];

  test('should fill gap by id with the proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.fillGapById.mockResolvedValueOnce(mockResult);
    fillGapByIdRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { query: mockQuery });

    expect(config.path).toEqual('/internal/alerting/rules/gaps/_fill_by_id');

    await handler(context, req, res);

    expect(rulesClient.fillGapById).toHaveBeenLastCalledWith({
      gapId: mockQuery.gap_id,
      ruleId: mockQuery.rule_id,
    });
    expect(res.ok).toHaveBeenLastCalledWith({
      body: [
        {
          id: 'backfill-1',
          created_at: '2024-01-30T00:00:00.000Z',
          duration: '12h',
          enabled: true,
          rule: {
            name: 'my rule name',
            tags: ['foo'],
            rule_type_id: 'myType',
            params: {},
            api_key_owner: 'user',
            api_key_created_by_user: false,
            consumer: 'myApp',
            enabled: true,
            schedule: { interval: '12h' },
            created_by: 'user',
            updated_by: 'user',
            created_at: '2019-02-12T21:01:22.479Z',
            updated_at: '2019-02-12T21:01:22.479Z',
            revision: 0,
            id: 'rule-1',
            actions: [],
          },
          space_id: 'default',
          start: '2023-11-16T08:00:00.000Z',
          status: 'pending',
          schedule: [
            {
              run_at: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: 'pending',
            },
          ],
        },
      ],
    });
  });

  test('ensures the license allows for filling gap by id', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.fillGapById.mockResolvedValueOnce(mockResult);
    fillGapByIdRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { query: mockQuery });
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents filling gap by id when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    fillGapByIdRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { query: mockQuery });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
