/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unsnoozeRuleRoute } from './unsnooze_rule_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../../lib/errors/rule_type_disabled';
import type { SanitizedRule } from '../../../../../types';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('unsnoozeAlertRoute', () => {
  const mockedRule: SanitizedRule<{
    bar: boolean;
  }> = {
    id: '1',
    alertTypeId: '1',
    schedule: { interval: '10s' },
    params: {
      bar: true,
    },
    createdAt: new Date('2020-08-20T19:23:38Z'),
    updatedAt: new Date('2020-08-20T19:23:38Z'),
    actions: [],
    snoozeSchedule: [
      {
        id: 'snooze_schedule_1',
        duration: 600000,
        rRule: {
          interval: 1,
          freq: 3,
          dtstart: '2025-03-01T06:30:37.011Z',
          tzid: 'UTC',
        },
      },
    ],
    consumer: 'bar',
    name: 'abc',
    tags: ['foo'],
    enabled: true,
    muteAll: false,
    notifyWhen: 'onActionGroupChange',
    createdBy: '',
    updatedBy: '',
    apiKeyOwner: '',
    throttle: '30s',
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient.get = jest.fn().mockResolvedValue(mockedRule);
  });

  it('unsnoozes a rule', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    unsnoozeRuleRoute(router, licenseState);

    const [config, handler] = router.delete.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}"`
    );

    rulesClient.get.mockResolvedValueOnce(mockedRule);
    rulesClient.unsnooze.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          ruleId: 'rule_1',
          scheduleId: 'snooze_schedule_1',
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.unsnooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.unsnooze.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "rule_1",
          "scheduleIds": Array [
            "snooze_schedule_1",
          ],
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    rulesClient.get.mockResolvedValueOnce(mockedRule);

    unsnoozeRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    rulesClient.unsnooze.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { ruleId: 'rule_1', scheduleId: 'snooze_schedule_1' }, body: {} },
      ['ok', 'forbidden']
    );

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  it('should throw error when snooze schedule is empty', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    rulesClient.get.mockResolvedValueOnce({ ...mockedRule, snoozeSchedule: [] });

    unsnoozeRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { ruleId: 'rule_1', scheduleId: 'snooze_schedule_1' }, body: {} },
      ['ok', 'forbidden']
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: Rule has no snooze schedules.]`
    );
  });

  it('should throw error for invalid snooze schedule id', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    rulesClient.get.mockResolvedValueOnce(mockedRule);

    unsnoozeRuleRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { ruleId: 'rule_1', scheduleId: 'random_schedule_1' }, body: {} },
      ['ok', 'forbidden']
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: Rule has no snooze schedule with id random_schedule_1.]`
    );
  });

  describe('internally managed rule types', () => {
    it('returns 400 if the rule type is internally managed', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      rulesClient.get = jest
        .fn()
        .mockResolvedValue({ ...mockedRule, alertTypeId: 'test.internal-rule-type' });

      unsnoozeRuleRoute(router, licenseState);

      const [config, handler] = router.delete.mock.calls[0];

      expect(config.path).toMatchInlineSnapshot(
        `"/api/alerting/rule/{ruleId}/snooze_schedule/{scheduleId}"`
      );

      rulesClient.unsnooze.mockResolvedValueOnce();

      const [context, req, res] = mockHandlerArguments(
        {
          rulesClient, // @ts-expect-error: not all args are required for this test
          listTypes: new Map([
            ['test.internal-rule-type', { id: 'test.internal-rule-type', internallyManaged: true }],
          ]),
        },
        {
          params: {
            ruleId: '1',
            scheduleId: 'snooze_schedule_1',
          },
        },
        ['noContent']
      );

      await expect(handler(context, req, res)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot unsnooze rule of type \\"test.internal-rule-type\\" because it is internally managed."`
      );
    });
  });
});
