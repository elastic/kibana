/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { bulkDeleteRulesRoute } from './bulk_delete_rules_route';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../lib/errors/rule_type_disabled';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { RuleAction, RuleSystemAction, SanitizedRule } from '../../../../types';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('bulkDeleteRulesRoute', () => {
  const bulkDeleteRequest = { filter: '' };
  const bulkDeleteResult = { rules: [], errors: [], total: 1, taskIdsFailedToBeDeleted: [] };

  it('should delete rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkDeleteRulesRoute({ router, licenseState });

    const [config, handler] = router.patch.mock.calls[0];

    expect(config.path).toBe('/internal/alerting/rules/_bulk_delete');

    rulesClient.bulkDeleteRules.mockResolvedValueOnce(bulkDeleteResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkDeleteRequest,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: bulkDeleteResult,
    });

    expect(rulesClient.bulkDeleteRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkDeleteRules.mock.calls[0]).toEqual([bulkDeleteRequest]);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows bulk deleting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    rulesClient.bulkDeleteRules.mockResolvedValueOnce(bulkDeleteResult);

    bulkDeleteRulesRoute({ router, licenseState });

    const [, handler] = router.patch.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkDeleteRequest,
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents bulk deleting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });

    bulkDeleteRulesRoute({ router, licenseState });

    const [, handler] = router.patch.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: bulkDeleteRequest,
      }
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkDeleteRulesRoute({ router, licenseState });

    const [, handler] = router.patch.mock.calls[0];

    rulesClient.bulkDeleteRules.mockRejectedValue(
      new RuleTypeDisabledError('Fail', 'license_invalid')
    );

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  describe('actions', () => {
    const mockedRule: SanitizedRule<{}> = {
      id: '1',
      alertTypeId: '1',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      actions: [
        {
          group: 'default',
          id: '2',
          actionTypeId: 'test',
          params: {
            foo: true,
          },
          uuid: '123-456',
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

    const action: RuleAction = {
      actionTypeId: 'test',
      group: 'default',
      id: '2',
      params: {
        foo: true,
      },
      uuid: '123-456',
    };

    const systemAction: RuleSystemAction = {
      actionTypeId: 'test-2',
      id: 'system_action-id',
      params: {
        foo: true,
      },
      uuid: '123-456',
    };

    const mockedRules: Array<SanitizedRule<{}>> = [
      { ...mockedRule, actions: [action], systemActions: [systemAction] },
    ];

    const bulkDeleteActionsResult = {
      rules: mockedRules,
      errors: [],
      total: 1,
      taskIdsFailedToBeDeleted: [],
    };

    it('merges actions and systemActions correctly before sending the response', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      bulkDeleteRulesRoute({ router, licenseState });
      const [_, handler] = router.patch.mock.calls[0];

      rulesClient.bulkDeleteRules.mockResolvedValueOnce(bulkDeleteActionsResult);

      const [context, req, res] = mockHandlerArguments(
        { rulesClient, actionsClient },
        {
          body: bulkDeleteRequest,
        },
        ['ok']
      );

      const routeRes = await handler(context, req, res);

      // @ts-expect-error: body exists
      expect(routeRes.body.systemActions).toBeUndefined();
      // @ts-expect-error: body exists
      expect(routeRes.body.rules[0].actions).toEqual([
        {
          connector_type_id: 'test',
          group: 'default',
          id: '2',
          params: {
            foo: true,
          },
          uuid: '123-456',
        },
        {
          connector_type_id: 'test-2',
          id: 'system_action-id',
          params: {
            foo: true,
          },
          uuid: '123-456',
        },
      ]);
    });
  });
});
