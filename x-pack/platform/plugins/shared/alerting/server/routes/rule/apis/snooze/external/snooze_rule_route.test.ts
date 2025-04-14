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
const mockedUUID = 'schedule-id-1';
jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('schedule-id-1'),
}));

const schedule = {
  custom: {
    duration: '10d',
    start: '2021-03-07T00:00:00.000Z',
    recurring: {
      occurrences: 1,
    },
  },
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
      id: mockedUUID,
      rRule: {
        count: 1,
        tzid: 'UTC',
        dtstart: '2021-03-07T00:00:00.000Z',
      },
    },
  ],
};

rulesClient.update.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

describe('snoozeAlertRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('snoozes a rule', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}/snooze_schedule"`);

    rulesClient.snooze.mockResolvedValueOnce(mockedRule as unknown as SanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          schedule,
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.snooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.snooze.mock.calls[0][0].snoozeSchedule.duration).toMatchInlineSnapshot(
      `864000000`
    );
    expect(rulesClient.snooze.mock.calls[0][0].snoozeSchedule.rRule).toMatchInlineSnapshot(`
      Object {
        "bymonth": undefined,
        "bymonthday": undefined,
        "byweekday": undefined,
        "count": 1,
        "dtstart": "2021-03-07T00:00:00.000Z",
        "freq": undefined,
        "interval": undefined,
        "tzid": "UTC",
        "until": undefined,
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        schedule: { custom: { ...schedule.custom, timezone: 'UTC' }, id: mockedUUID },
      },
    });
  });

  it('snoozes an alert with recurring', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}/snooze_schedule"`);

    rulesClient.snooze.mockResolvedValueOnce({
      ...mockedRule,
      snoozeSchedule: [
        {
          duration: 864000000,
          id: mockedUUID,
          rRule: {
            tzid: 'America/New_York',
            dtstart: '2021-03-07T00:00:00.000Z',
            byweekday: ['MO'],
            freq: 2,
            interval: 1,
            until: '2021-05-10T00:00:00.000Z',
          },
        },
      ],
    } as unknown as SanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          schedule: {
            custom: {
              duration: '10d',
              start: '2021-03-07T00:00:00.000Z',
              timezone: 'America/New_York',
              recurring: {
                every: '1w',
                end: '2021-05-10T00:00:00.000Z',
                onWeekDay: ['MO'],
              },
            },
          },
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.snooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.snooze.mock.calls[0][0].snoozeSchedule.rRule).toMatchInlineSnapshot(`
      Object {
        "bymonth": undefined,
        "bymonthday": undefined,
        "byweekday": Array [
          "MO",
        ],
        "count": undefined,
        "dtstart": "2021-03-07T00:00:00.000Z",
        "freq": 2,
        "interval": 1,
        "tzid": "America/New_York",
        "until": "2021-05-10T00:00:00.000Z",
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        schedule: {
          custom: {
            duration: '10d',
            start: '2021-03-07T00:00:00.000Z',
            timezone: 'America/New_York',
            recurring: {
              every: '1w',
              end: '2021-05-10T00:00:00.000Z',
              onWeekDay: ['MO'],
            },
          },
          id: mockedUUID,
        },
      },
    });
  });

  it('snoozes an alert with occurrences', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}/snooze_schedule"`);

    rulesClient.snooze.mockResolvedValueOnce({
      ...mockedRule,
      snoozeSchedule: [
        {
          duration: 864000000,
          id: mockedUUID,
          rRule: {
            count: 5,
            dtstart: '2021-03-07T00:00:00.000Z',
            freq: 0,
            interval: 1,
            tzid: 'UTC',
            bymonth: [2, 4, 6, 8, 10, 12],
            bymonthday: [5, 25],
          },
        },
      ],
    } as unknown as SanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          schedule: {
            custom: {
              duration: '10d',
              start: '2021-03-07T00:00:00.000Z',
              recurring: {
                every: '1y',
                occurrences: 5,
                onMonthDay: [5, 25],
                onMonth: [2, 4, 6, 8, 10, 12],
              },
            },
          },
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.snooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.snooze.mock.calls[0][0].snoozeSchedule.rRule).toMatchInlineSnapshot(`
      Object {
        "bymonth": Array [
          2,
          4,
          6,
          8,
          10,
          12,
        ],
        "bymonthday": Array [
          5,
          25,
        ],
        "byweekday": undefined,
        "count": 5,
        "dtstart": "2021-03-07T00:00:00.000Z",
        "freq": 0,
        "interval": 1,
        "tzid": "UTC",
        "until": undefined,
      }
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        schedule: {
          custom: {
            duration: '10d',
            start: '2021-03-07T00:00:00.000Z',
            recurring: {
              every: '1y',
              occurrences: 5,
              onMonthDay: [5, 25],
              onMonth: [2, 4, 6, 8, 10, 12],
            },
            timezone: 'UTC',
          },
          id: mockedUUID,
        },
      },
    });
  });

  it('throws error when body does not include custom schedule', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: '1' }, body: { schedule: { duration: '1h' } } },
      ['ok', 'forbidden']
    );

    await expect(handler(context, req, res)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"A schedule is required"`
    );
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.snooze.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: '1' }, body: { schedule: { custom: { duration: '1h' } } } },
      ['ok', 'forbidden']
    );

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
