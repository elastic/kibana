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
import { snoozeRuleRoute } from './snooze_rule_route';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

const schedule = {
  duration: '240h',
  start: '2021-03-07T00:00:00.000Z',
  recurring: {
    occurrences: 1,
  },
};

describe('snoozeAlertRoute', () => {
  it('snoozes an alert', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}/_snooze"`);

    rulesClient.snooze.mockResolvedValueOnce();

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
    expect(rulesClient.snooze.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "snoozeSchedule": Object {
            "duration": 864000000,
            "rRule": Object {
              "bymonth": undefined,
              "bymonthday": undefined,
              "byweekday": undefined,
              "count": 1,
              "dtstart": "2021-03-07T00:00:00.000Z",
              "freq": undefined,
              "interval": undefined,
              "tzid": "UTC",
              "until": undefined,
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

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}/_snooze"`);

    rulesClient.snooze.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          schedule: {
            ...schedule,
            duration: '-1',
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
              "bymonth": undefined,
              "bymonthday": undefined,
              "byweekday": undefined,
              "count": 1,
              "dtstart": "2021-03-07T00:00:00.000Z",
              "freq": undefined,
              "interval": undefined,
              "tzid": "UTC",
              "until": undefined,
            },
          },
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('snoozes an alert with recurring', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}/_snooze"`);

    rulesClient.snooze.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          schedule: {
            ...schedule,
            recurring: {
              every: '1w',
              end: '2021-05-10T00:00:00.000Z',
              onWeekDay: ['MO'],
            },
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
            "duration": 864000000,
            "rRule": Object {
              "bymonth": undefined,
              "bymonthday": undefined,
              "byweekday": Array [
                "MO",
              ],
              "count": undefined,
              "dtstart": "2021-03-07T00:00:00.000Z",
              "freq": 2,
              "interval": 1,
              "tzid": "UTC",
              "until": "2021-05-10T00:00:00.000Z",
            },
          },
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('snoozes an alert with occurrences', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}/_snooze"`);

    rulesClient.snooze.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          schedule: {
            ...schedule,
            recurring: {
              every: '1y',
              occurrences: 5,
              onMonthDay: [5, 25],
              onMonth: [2, 4, 6, 8, 10, 12],
            },
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
            "duration": 864000000,
            "rRule": Object {
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

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: '1' }, body: { schedule: { duration: '1h' } } },
      ['ok', 'forbidden']
    );

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
