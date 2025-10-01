/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../../lib/errors/rule_type_disabled';
import type { SanitizedRule } from '../../../../../../common';
import { snoozeRuleRoute } from './snooze_rule_route';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const SNOOZE_SCHEDULE = {
  rRule: {
    dtstart: '2021-03-07T00:00:00.000Z',
    tzid: 'UTC',
    count: 1,
  },
  duration: 864000000,
};

const mockedRule = {
  apiKeyOwner: 'api-key-owner',
  consumer: 'bar',
  createdBy: 'elastic',
  updatedBy: 'elastic',
  enabled: true,
  id: '1',
  name: 'abc',
  alertTypeId: '1',
  tags: ['foo'],
  throttle: '10m',
  schedule: { interval: '12s' },
  params: {
    otherField: false,
  },
  createdAt: new Date('2019-02-12T21:01:22.479Z'),
  updatedAt: new Date('2019-02-12T21:01:22.479Z'),
  snoozeSchedule: [
    {
      duration: 864000000,
      id: 'random-schedule-id',
      rRule: {
        count: 1,
        tzid: 'UTC',
        dtstart: '2021-03-07T00:00:00.000Z',
      },
    },
  ],
};

describe('snoozeAlertRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient.get = jest.fn().mockResolvedValue(mockedRule);
  });

  it('snoozes an alert', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_snooze"`);

    rulesClient.snooze.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          snooze_schedule: SNOOZE_SCHEDULE,
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.snooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.snooze.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "snoozeSchedule": Object {
            "duration": 864000000,
            "rRule": Object {
              "count": 1,
              "dtstart": "2021-03-07T00:00:00.000Z",
              "tzid": "UTC",
            },
          },
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('also snoozes an alert when passed snoozeEndTime of -1', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_snooze"`);

    rulesClient.snooze.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          snooze_schedule: {
            ...SNOOZE_SCHEDULE,
            duration: -1,
          },
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.snooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.snooze.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "snoozeSchedule": Object {
            "duration": -1,
            "rRule": Object {
              "count": 1,
              "dtstart": "2021-03-07T00:00:00.000Z",
              "tzid": "UTC",
            },
          },
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.snooze.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  describe('internally managed rule types', () => {
    it('returns 400 if the rule type is internally managed', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      rulesClient.get = jest
        .fn()
        .mockResolvedValue({ ...mockedRule, alertTypeId: 'test.internal-rule-type' });

      snoozeRuleRoute(router, licenseState);

      const [config, handler] = router.post.mock.calls[0];

      expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_snooze"`);

      rulesClient.snooze.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

      const [context, req, res] = mockHandlerArguments(
        {
          rulesClient, // @ts-expect-error: not all args are required for this test
          listTypes: new Map([
            ['test.internal-rule-type', { id: 'test.internal-rule-type', internallyManaged: true }],
          ]),
        },
        {
          params: {
            id: '1',
          },
          body: {
            snooze_schedule: SNOOZE_SCHEDULE,
          },
        },
        ['noContent']
      );

      await expect(handler(context, req, res)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot snooze rule of type \\"test.internal-rule-type\\" because it is internally managed."`
      );
    });
  });
});
