/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EVALUATION_TIME_RANGE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_UUID,
} from '@kbn/rule-data-utils';
import { ruleQueryInspectorRoute } from './rule_query_inspector_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
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

const mockAlertDoc = {
  [ALERT_RULE_UUID]: 'rule-123',
  [ALERT_RULE_PARAMETERS]: { criteria: [{ threshold: 90 }], searchConfiguration: {} },
  [ALERT_EVALUATION_TIME_RANGE]: {
    gte: '2026-01-01T00:00:00.000Z',
    lte: '2026-01-01T00:05:00.000Z',
  },
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

const mockGetAlertIndicesAlias = jest
  .fn()
  .mockReturnValue(['.alerts-observability.custom_threshold-default']);

const createMockCoreSetup = (alertDoc?: Record<string, unknown>) => {
  const coreSetup = coreMock.createSetup();
  const mockSearch = jest.fn().mockResolvedValue({
    hits: { hits: alertDoc ? [{ _source: alertDoc }] : [] },
  });
  coreSetup.getStartServices.mockResolvedValue([
    {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: { search: mockSearch },
          }),
        },
      },
    } as unknown as ReturnType<typeof coreMock.createStart>,
    {} as unknown as Record<string, unknown>,
    {} as unknown as Record<string, unknown>,
  ]);
  return { coreSetup, mockSearch };
};

describe('ruleQueryInspectorRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient.get = jest.fn().mockResolvedValue(mockRule);
    rulesClient.getSpaceId = jest.fn().mockReturnValue('default');
    mockGetAlertIndicesAlias.mockReturnValue(['.alerts-observability.custom_threshold-default']);
  });

  it('registers the route at the correct path', () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const registry = createMockRegistry();
    const { coreSetup } = createMockCoreSetup();

    ruleQueryInspectorRoute(router, licenseState, registry, mockGetAlertIndicesAlias, coreSetup);

    expect(router.get.mock.calls[0][0].path).toMatchInlineSnapshot(
      `"/api/alerting/rule/{id}/query_inspector"`
    );
  });

  it('calls the handler with current rule params when no alert_id', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockHandler = jest.fn().mockResolvedValue(mockInspectorResponse);
    const registry = createMockRegistry(mockHandler);
    const { coreSetup } = createMockCoreSetup();

    ruleQueryInspectorRoute(router, licenseState, registry, mockGetAlertIndicesAlias, coreSetup);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      { params: { id: 'rule-123' }, query: { mode: 'build' } },
      ['ok']
    );

    const result = await handler(context, req, res);

    expect(rulesClient.get).toHaveBeenCalledWith({ id: 'rule-123' });
    expect(registry.get).toHaveBeenCalledWith('observability.rules.custom_threshold');
    expect(mockHandler).toHaveBeenCalledWith(req, mockRule.params, 'build', undefined);
    expect(result).toEqual({ body: mockInspectorResponse });
  });

  it('returns badRequest when rule type is not supported', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const registry = createMockRegistry(undefined);
    const { coreSetup } = createMockCoreSetup();

    ruleQueryInspectorRoute(router, licenseState, registry, mockGetAlertIndicesAlias, coreSetup);

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

  it('uses alert params and time range when alert_id is provided', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockHandler = jest.fn().mockResolvedValue(mockInspectorResponse);
    const registry = createMockRegistry(mockHandler);
    const { coreSetup } = createMockCoreSetup(mockAlertDoc);

    ruleQueryInspectorRoute(router, licenseState, registry, mockGetAlertIndicesAlias, coreSetup);

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

    expect(mockHandler).toHaveBeenCalledWith(req, mockAlertDoc[ALERT_RULE_PARAMETERS], 'execute', {
      gte: '2026-01-01T00:00:00.000Z',
      lte: '2026-01-01T00:05:00.000Z',
    });
  });

  it('returns badRequest when alert does not belong to rule', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockHandler = jest.fn().mockResolvedValue(mockInspectorResponse);
    const registry = createMockRegistry(mockHandler);
    const { coreSetup } = createMockCoreSetup({
      ...mockAlertDoc,
      [ALERT_RULE_UUID]: 'different-rule',
    });

    ruleQueryInspectorRoute(router, licenseState, registry, mockGetAlertIndicesAlias, coreSetup);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'rule-123' },
        query: { mode: 'build', alert_id: 'alert-456' },
      },
      ['badRequest', 'ok']
    );

    await handler(context, req, res);

    expect(res.badRequest).toHaveBeenCalledWith({
      body: {
        message: 'Alert "alert-456" does not belong to rule "rule-123"',
      },
    });
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('returns notFound when alert does not exist', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockHandler = jest.fn().mockResolvedValue(mockInspectorResponse);
    const registry = createMockRegistry(mockHandler);
    const { coreSetup } = createMockCoreSetup(undefined);

    ruleQueryInspectorRoute(router, licenseState, registry, mockGetAlertIndicesAlias, coreSetup);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'rule-123' },
        query: { mode: 'build', alert_id: 'alert-456' },
      },
      ['notFound', 'ok']
    );

    await handler(context, req, res);

    expect(res.notFound).toHaveBeenCalledWith({
      body: {
        message: 'Alert "alert-456" not found',
      },
    });
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('falls back to current rule params when alert has no ALERT_RULE_PARAMETERS', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const mockHandler = jest.fn().mockResolvedValue(mockInspectorResponse);
    const registry = createMockRegistry(mockHandler);
    const alertDocWithoutParams = {
      [ALERT_RULE_UUID]: 'rule-123',
      [ALERT_EVALUATION_TIME_RANGE]: {
        gte: '2026-01-01T00:00:00.000Z',
        lte: '2026-01-01T00:05:00.000Z',
      },
    };
    const { coreSetup } = createMockCoreSetup(alertDocWithoutParams);

    ruleQueryInspectorRoute(router, licenseState, registry, mockGetAlertIndicesAlias, coreSetup);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'rule-123' },
        query: { mode: 'build', alert_id: 'alert-456' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(mockHandler).toHaveBeenCalledWith(req, mockRule.params, 'build', {
      gte: '2026-01-01T00:00:00.000Z',
      lte: '2026-01-01T00:05:00.000Z',
    });
  });
});
