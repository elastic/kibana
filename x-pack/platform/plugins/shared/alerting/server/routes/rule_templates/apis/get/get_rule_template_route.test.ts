/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { getInternalRuleTemplateRoute } from './get_rule_template_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import type { RuleTemplate } from '../../../../application/rule_template/types';

const rulesClient = rulesClientMock.create();
jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getInternalRuleTemplateRoute', () => {
  const mockedTemplate: RuleTemplate = {
    id: '1',
    name: 'My rule template',
    description: 'My rule template description',
    ruleTypeId: '1',
    schedule: { interval: '10s' },
    params: {
      bar: true,
    },
    tags: ['foo'],
  };

  const getResult = {
    ...pick(mockedTemplate, 'name', 'schedule', 'tags', 'params', 'description'),
    rule_type_id: mockedTemplate.ruleTypeId,
    id: mockedTemplate.id,
  };

  it('gets a rule template with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getInternalRuleTemplateRoute(router, licenseState);
    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule_template/{id}"`);

    rulesClient.getTemplate.mockResolvedValueOnce(mockedTemplate);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(rulesClient.getTemplate).toHaveBeenCalledTimes(1);
    expect(rulesClient.getTemplate.mock.calls[0][0].id).toEqual('1');

    expect(res.ok).toHaveBeenCalledWith({
      body: getResult,
    });
  });

  it('ensures the license allows getting rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getInternalRuleTemplateRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.getTemplate.mockResolvedValueOnce(mockedTemplate);

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

    getInternalRuleTemplateRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.getTemplate.mockResolvedValueOnce(mockedTemplate);

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
});
