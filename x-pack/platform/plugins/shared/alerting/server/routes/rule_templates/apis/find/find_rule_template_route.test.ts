/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findInternalRuleTemplatesRoute } from './find_rule_template_route';
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

describe('findInternalRuleTemplatesRoute', () => {
  const mockedTemplate1: RuleTemplate = {
    id: '1',
    name: 'My rule template 1',
    description: 'My rule template description 1',
    ruleTypeId: 'test.rule.type',
    schedule: { interval: '10s' },
    params: {
      bar: true,
    },
    tags: ['foo'],
  };

  const mockedTemplate2: RuleTemplate = {
    id: '2',
    name: 'My rule template 2',
    description: 'My rule template description 2',
    ruleTypeId: 'test.rule.type',
    schedule: { interval: '5m' },
    params: {
      baz: 123,
    },
    tags: ['bar'],
  };

  const findResult = {
    page: 1,
    perPage: 10,
    total: 2,
    data: [mockedTemplate1, mockedTemplate2],
  };

  it('finds rule templates with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRuleTemplatesRoute(router, licenseState);
    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule_template/_find"`);

    rulesClient.findTemplates.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 10,
          page: 1,
        },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(rulesClient.findTemplates).toHaveBeenCalledTimes(1);
    expect(rulesClient.findTemplates.mock.calls[0][0]).toEqual({
      perPage: 10,
      page: 1,
      search: undefined,
      defaultSearchOperator: undefined,
      sortField: undefined,
      sortOrder: undefined,
      ruleTypeId: undefined,
      tags: undefined,
    });

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        page: 1,
        per_page: 10,
        total: 2,
        data: [
          {
            id: '1',
            name: 'My rule template 1',
            description: 'My rule template description 1',
            rule_type_id: 'test.rule.type',
            schedule: { interval: '10s' },
            params: { bar: true },
            tags: ['foo'],
          },
          {
            id: '2',
            name: 'My rule template 2',
            description: 'My rule template description 2',
            rule_type_id: 'test.rule.type',
            schedule: { interval: '5m' },
            params: { baz: 123 },
            tags: ['bar'],
          },
        ],
      },
    });
  });

  it('finds rule templates with all query parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRuleTemplatesRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    rulesClient.findTemplates.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 5,
          page: 2,
          search: 'test',
          sort_field: 'name',
          sort_order: 'desc',
          rule_type_id: 'test.rule.type',
        },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(rulesClient.findTemplates).toHaveBeenCalledTimes(1);
    expect(rulesClient.findTemplates.mock.calls[0][0]).toEqual({
      perPage: 5,
      page: 2,
      search: 'test',
      defaultSearchOperator: undefined,
      sortField: 'name',
      sortOrder: 'desc',
      ruleTypeId: 'test.rule.type',
      tags: undefined,
    });
  });

  it('handles tags parameter as array', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRuleTemplatesRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    rulesClient.findTemplates.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 10,
          page: 1,
          tags: ['tag1', 'tag2'],
        },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(rulesClient.findTemplates.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        tags: ['tag1', 'tag2'],
      })
    );
  });

  it('handles tags parameter as single string', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRuleTemplatesRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    rulesClient.findTemplates.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 10,
          page: 1,
          tags: 'tag1',
        },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(rulesClient.findTemplates.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        tags: ['tag1'],
      })
    );
  });

  it('handles default_search_operator parameter', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRuleTemplatesRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    rulesClient.findTemplates.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 10,
          page: 1,
          search: 'test',
          default_search_operator: 'AND',
        },
      },
      ['ok']
    );
    await handler(context, req, res);

    expect(rulesClient.findTemplates.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        search: 'test',
        defaultSearchOperator: 'AND',
      })
    );
  });

  it('handles errors from rulesClient', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRuleTemplatesRoute(router, licenseState);
    const [, handler] = router.get.mock.calls[0];

    const error = new Error('Something went wrong');
    rulesClient.findTemplates.mockRejectedValueOnce(error);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 10,
          page: 1,
        },
      },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toThrow('Something went wrong');
  });

  it('ensures the license allows finding rule templates', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findInternalRuleTemplatesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.findTemplates.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 10,
          page: 1,
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents finding rule templates', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    findInternalRuleTemplatesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.findTemplates.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 10,
          page: 1,
        },
      },
      ['ok']
    );

    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
