/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleQueryInspectorRoute } from './rule_query_inspector_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import type { RuleQueryInspectorRegistry } from '../../../../rule_query_inspector/registry';
import type { RuleQueryInspectorHandler } from '../../../../rule_query_inspector/types';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const mockRule = {
  id: 'rule-123',
  alertTypeId: 'observability.rules.custom_threshold',
  params: { criteria: [], searchConfiguration: {} },
};

const mockInspectorResponse = {
  queries: [
    {
      index: 'metrics-*',
      request: { body: { query: { bool: {} } } },
    },
  ],
};

const createMockRegistry = (
  handler?: RuleQueryInspectorHandler
): jest.Mocked<RuleQueryInspectorRegistry> =>
  ({
    register: jest.fn(),
    get: jest.fn().mockReturnValue(handler),
  } as unknown as jest.Mocked<RuleQueryInspectorRegistry>);

describe('ruleQueryInspectorRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient.get = jest.fn().mockResolvedValue(mockRule);
  });

  it('registers the route at the correct path', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const registry = createMockRegistry();

    ruleQueryInspectorRoute(router, licenseState, registry);

    expect(router.get.mock.calls[0][0].path).toMatchInlineSnapshot(
      `"/api/alerting/rule/{id}/query_inspector"`
    );
  });

  it('calls the handler and returns the result', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockHandler = jest.fn().mockResolvedValue(mockInspectorResponse);
    const registry = createMockRegistry(mockHandler);

    ruleQueryInspectorRoute(router, licenseState, registry);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'rule-123' }, query: { mode: 'build' } },
      ['ok']
    );

    const result = await handler(context, req, res);

    expect(rulesClient.get).toHaveBeenCalledWith({ id: 'rule-123' });
    expect(registry.get).toHaveBeenCalledWith('observability.rules.custom_threshold');
    expect(mockHandler).toHaveBeenCalledWith(req, 'rule-123', mockRule.params, 'build', undefined);
    expect(result).toEqual({ body: mockInspectorResponse });
  });

  it('returns badRequest when rule type is not supported', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const registry = createMockRegistry(undefined);

    ruleQueryInspectorRoute(router, licenseState, registry);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'rule-123' }, query: { mode: 'build' } },
      ['badRequest', 'ok']
    );

    await handler(context, req, res);

    expect(res.badRequest).toHaveBeenCalledWith({
      body: {
        message: `Query inspection is not supported for rule type "observability.rules.custom_threshold"`,
      },
    });
  });

  it('passes alertId to the handler when alert_id query param is provided', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockHandler = jest.fn().mockResolvedValue(mockInspectorResponse);
    const registry = createMockRegistry(mockHandler);

    ruleQueryInspectorRoute(router, licenseState, registry);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'rule-123' },
        query: { mode: 'execute', alert_id: 'alert-456' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(mockHandler).toHaveBeenCalledWith(
      req,
      'rule-123',
      mockRule.params,
      'execute',
      'alert-456'
    );
  });

  it('passes undefined alertId when alert_id query param is absent', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockHandler = jest.fn().mockResolvedValue(mockInspectorResponse);
    const registry = createMockRegistry(mockHandler);

    ruleQueryInspectorRoute(router, licenseState, registry);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'rule-123' }, query: { mode: 'build' } },
      ['ok']
    );

    await handler(context, req, res);

    expect(mockHandler).toHaveBeenCalledWith(req, 'rule-123', mockRule.params, 'build', undefined);
  });
});
