/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { disableRuleRoute } from './disable_rule_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../lib/errors/rule_type_disabled';
import { mockedRule } from '../../../../task_runner/fixtures';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  rulesClient.get = jest.fn().mockResolvedValue(mockedRule);
});

describe('disableRuleRoute', () => {
  it('disables a rule', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    disableRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id}/_disable"`);

    rulesClient.disableRule.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.disableRule).toHaveBeenCalledTimes(1);
    expect(rulesClient.disableRule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "untrack": false,
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    disableRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.disableRule.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

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

      disableRuleRoute(router, licenseState);

      const [_, handler] = router.post.mock.calls[0];

      const [context, req, res] = mockHandlerArguments(
        {
          rulesClient,
          // @ts-expect-error: not all args are required for this test
          listTypes: new Map([
            ['test.internal-rule-type', { id: 'test.internal-rule-type', internallyManaged: true }],
          ]),
        },
        {
          params: {
            id: '1',
          },
        },
        ['ok']
      );

      await handler(context, req, res);

      expect(res.badRequest).toHaveBeenCalledWith({
        body: {
          message:
            'Cannot disable rule of type "test.internal-rule-type" because it is internally managed.',
        },
      });
    });
  });
});
