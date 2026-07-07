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
    jest.clearAllMocks();
    rulesClient.get = jest.fn().mockResolvedValue(mockedRule);
  });

  it('unsnoozes an alert', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    unsnoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_unsnooze"`);

    rulesClient.unsnooze.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          scheduleIds: undefined,
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.unsnooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.unsnooze.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    unsnoozeRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.unsnooze.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

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

      unsnoozeRuleRoute(router, licenseState);

      const [config, handler] = router.post.mock.calls[0];

      expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_unsnooze"`);

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
            id: '1',
          },
          body: {
            scheduleIds: undefined,
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
