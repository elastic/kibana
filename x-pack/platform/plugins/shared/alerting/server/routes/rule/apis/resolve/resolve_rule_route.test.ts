/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { resolveRuleRoute } from './resolve_rule_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { ResolvedRule } from '../../../../application/rule/methods/resolve/types';
import { ResolvedSanitizedRule, RuleAction, RuleSystemAction } from '../../../../../common';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('resolveRuleRoute', () => {
  const action: RuleAction = {
    group: 'default',
    id: '2',
    actionTypeId: 'test',
    params: {
      foo: true,
    },
    uuid: '123-456',
    useAlertDataForTemplate: false,
  };

  const systemAction: RuleSystemAction = {
    actionTypeId: 'test-2',
    id: 'system_action-id',
    params: {
      foo: true,
    },
    uuid: '123-456',
  };

  const mockedRule: ResolvedRule<{
    bar: boolean;
  }> = {
    id: '1',
    alertTypeId: '1',
    schedule: { interval: '10s' },
    params: {
      bar: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    actions: [action],
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
    outcome: 'aliasMatch',
    alias_target_id: '2',
    revision: 0,
  };

  const resolveResult = {
    ...pick(
      mockedRule,
      'consumer',
      'name',
      'schedule',
      'tags',
      'params',
      'throttle',
      'enabled',
      'alias_target_id'
    ),
    rule_type_id: mockedRule.alertTypeId,
    notify_when: mockedRule.notifyWhen,
    mute_all: mockedRule.muteAll,
    created_by: mockedRule.createdBy,
    updated_by: mockedRule.updatedBy,
    api_key_owner: mockedRule.apiKeyOwner,
    muted_alert_ids: mockedRule.mutedInstanceIds,
    created_at: mockedRule.createdAt.toISOString(),
    updated_at: mockedRule.updatedAt.toISOString(),
    id: mockedRule.id,
    revision: mockedRule.revision,
    execution_status: {
      status: mockedRule.executionStatus!.status,
      last_execution_date: mockedRule.executionStatus!.lastExecutionDate.toISOString(),
    },
    actions: [
      {
        group: mockedRule.actions[0].group,
        id: mockedRule.actions[0].id,
        params: mockedRule.actions[0].params,
        connector_type_id: mockedRule.actions[0].actionTypeId,
        uuid: mockedRule.actions[0].uuid,
        use_alert_data_for_template: (mockedRule.actions[0] as RuleAction).useAlertDataForTemplate,
      },
    ],
    outcome: 'aliasMatch',
  };

  it('resolves a rule with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    resolveRuleRoute(router, licenseState);
    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_resolve"`);

    // TODO (http-versioning): Remove this cast, this enables us to move forward
    // without fixing all of other solution types
    rulesClient.resolve.mockResolvedValueOnce(mockedRule as ResolvedSanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(rulesClient.resolve).toHaveBeenCalledTimes(1);
    expect(rulesClient.resolve.mock.calls[0][0].id).toEqual('1');

    expect(res.ok).toHaveBeenCalledWith({
      body: resolveResult,
    });
  });

  it('ensures the license allows resolving rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    resolveRuleRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    // TODO (http-versioning): Remove this cast, this enables us to move forward
    // without fixing all of other solution types
    rulesClient.resolve.mockResolvedValueOnce(mockedRule as ResolvedSanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents getting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    resolveRuleRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    // TODO (http-versioning): Remove this cast, this enables us to move forward
    // without fixing all of other solution types
    rulesClient.resolve.mockResolvedValueOnce(mockedRule as ResolvedSanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('transforms the system actions in the response of the rules client correctly', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const actionsClient = actionsClientMock.create();
    actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

    resolveRuleRoute(router, licenseState);
    const [_, handler] = router.get.mock.calls[0];

    // TODO (http-versioning): Remove this cast, this enables us to move forward
    // without fixing all of other solution types
    rulesClient.resolve.mockResolvedValueOnce({
      ...mockedRule,
      actions: [action],
      systemActions: [systemAction],
    } as ResolvedSanitizedRule);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient, actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    const routeRes = await handler(context, req, res);

    // @ts-expect-error: body exists
    expect(routeRes.body.systemActions).toBeUndefined();
    // @ts-expect-error: body exists
    expect(routeRes.body.actions).toEqual([
      {
        connector_type_id: 'test',
        group: 'default',
        id: '2',
        params: {
          foo: true,
        },
        use_alert_data_for_template: false,
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
