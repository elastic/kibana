/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getAgentsRoute } from './get_agents';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

describe('getAgentsRoute', () => {
  let mockOsqueryContext: OsqueryAppContext;
  let mockRouter: ReturnType<
    ReturnType<typeof httpServiceMock.createSetupContract>['createRouter']
  >;
  let routeHandler: RequestHandler<unknown, Record<string, unknown>, unknown>;

  const mockListAgents = jest.fn();
  const mockAgentService = {
    asInternalScopedUser: jest.fn().mockReturnValue({ listAgents: mockListAgents }),
  };
  const mockPackagePolicyService = { list: jest.fn() };
  const mockAgentPolicyService = { getByIds: jest.fn() };

  const createMockRequest = (kuery = '') =>
    httpServerMock.createKibanaRequest({
      query: { kuery, page: 1, perPage: 100, showInactive: false },
    });

  // Re-parse the composed kuery so assertions check structure, not brittle substrings.
  const receivedKueryString = (): string => mockListAgents.mock.calls[0][0].kuery;
  const receivedKueryNode = (): KueryNode => fromKueryExpression(receivedKueryString());
  const receivedEsQuery = () => JSON.stringify(toElasticsearchQuery(receivedKueryNode()));

  beforeEach(() => {
    jest.clearAllMocks();

    mockAgentService.asInternalScopedUser.mockReturnValue({ listAgents: mockListAgents });
    mockPackagePolicyService.list.mockResolvedValue({
      items: [{ package: { version: '1.0.0' }, policy_ids: ['policy-1'] }],
    });
    mockAgentPolicyService.getByIds.mockResolvedValue([
      { id: 'policy-1', name: 'Production Policy' },
    ]);
    mockListAgents.mockResolvedValue({ total: 0, agents: [], aggregations: undefined });

    mockOsqueryContext = {
      logFactory: { get: jest.fn().mockReturnValue({ debug: jest.fn(), error: jest.fn() }) },
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        getAgentService: jest.fn().mockReturnValue(mockAgentService),
        getPackagePolicyService: jest.fn().mockReturnValue(mockPackagePolicyService),
        getAgentPolicyService: jest.fn().mockReturnValue(mockAgentPolicyService),
      },
    } as unknown as OsqueryAppContext;

    const httpService = httpServiceMock.createSetupContract();
    mockRouter = httpService.createRouter();

    getAgentsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/internal/osquery/fleet_wrapper/agents');
    const routeVersion = route.versions['1'];
    if (!routeVersion) {
      throw new Error('Handler for version [1] not found!');
    }

    routeHandler = routeVersion.handler;
  });

  it('merges version-suffixed policy buckets and resolves the base policy name', async () => {
    mockListAgents.mockResolvedValue({
      total: 7,
      agents: [],
      aggregations: {
        platforms: { buckets: [] },
        policies: {
          buckets: [
            { key: 'policy-1', doc_count: 2 },
            { key: 'policy-1#9.4', doc_count: 5 },
          ],
        },
      },
    });

    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler({} as never, createMockRequest() as never, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        groups: expect.objectContaining({
          policies: [{ id: 'policy-1', name: 'Production Policy', size: 7 }],
        }),
      }),
    });
  });

  it('applies osquery policy scope from server-side list even when kuery contains no policy_id', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler({} as never, createMockRequest('') as never, mockResponse);

    expect(receivedEsQuery()).toContain('policy-1');
    // With no search term the whole expression is just the scope.
    expect(receivedKueryNode().function).toBe('or');
  });

  it('expands a policy_name search to match version-suffixed policy ids and still applies scope', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler({} as never, createMockRequest('policy_name:prod') as never, mockResponse);

    // Top level must be the AND that binds the search clause to the policy scope.
    expect(receivedKueryNode().function).toBe('and');
    const esQuery = receivedEsQuery();
    expect(esQuery).toContain('policy-1');
    expect(esQuery).toContain('prod');
  });

  it('returns empty result when no osquery policies exist', async () => {
    mockPackagePolicyService.list.mockResolvedValue({ items: [] });
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler({} as never, createMockRequest('') as never, mockResponse);

    expect(mockListAgents).not.toHaveBeenCalled();
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({ total: 0, agents: [] }),
    });
  });

  it('excludes pre-0.6.0 package versions from the policy scope', async () => {
    mockPackagePolicyService.list.mockResolvedValue({
      items: [
        { package: { version: '0.5.0' }, policy_ids: ['old-policy'] },
        { package: { version: '1.0.0' }, policy_ids: ['new-policy'] },
      ],
    });
    mockAgentPolicyService.getByIds.mockResolvedValue([{ id: 'new-policy', name: 'New' }]);
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler({} as never, createMockRequest('') as never, mockResponse);

    const esQuery = receivedEsQuery();
    expect(esQuery).not.toContain('old-policy');
    expect(esQuery).toContain('new-policy');
  });

  it('handles empty kuery without truncating characters and produces valid scoped KQL', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler({} as never, createMockRequest('') as never, mockResponse);

    // Should be just the scope: a bare `or` over the policy-id values, no wrapping AND.
    expect(receivedKueryNode().function).toBe('or');
    expect(receivedEsQuery()).toContain('policy-1');
  });

  it('handles kuery that does not end in ) without truncating characters', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler(
      {} as never,
      createMockRequest('local_metadata.host.hostname.keyword:*myhost*') as never,
      mockResponse
    );

    // No character should have been sliced off from the search term
    const esQuery = receivedEsQuery();
    expect(esQuery).toContain('myhost');
    expect(esQuery).toContain('policy-1');
    expect(receivedKueryNode().function).toBe('and');
  });

  it('handles policy_name search matching nothing and still applies scope', async () => {
    mockAgentPolicyService.getByIds.mockResolvedValue([{ id: 'policy-1', name: 'Production' }]);
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler(
      {} as never,
      createMockRequest('policy_name:nonexistent') as never,
      mockResponse
    );

    const esQuery = receivedEsQuery();
    expect(esQuery).toContain('policy-1');
    expect(esQuery).toContain('nonexistent');
    expect(receivedKueryNode().function).toBe('and');
  });
  it('keeps the policy scope inescapable for an escaped hostile search term', async () => {
    // What the client sends for searchValue `a) or (b` after escapeKuery.
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler(
      {} as never,
      createMockRequest(
        'local_metadata.host.hostname.keyword:*a\\) \\or \\(b* or policy_name:a\\) \\or \\(b'
      ) as never,
      mockResponse
    );

    // Fleet's `includeUnenrolled` calls `.toLowerCase()`, so this must be a string.
    expect(typeof receivedKueryString()).toBe('string');

    const node = receivedKueryNode();
    expect(node.function).toBe('and');
    expect(node.arguments).toHaveLength(2);

    // The scope must sit in a `filter`, not as one `should` branch among many.
    const esQuery = toElasticsearchQuery(node) as { bool: { filter: unknown[] } };
    expect(esQuery.bool.filter).toBeDefined();
    expect(JSON.stringify(esQuery.bool.filter)).toContain('policy-1');
  });

  it('rejects an unescaped scope-breaking search term rather than widening the scope', async () => {
    // Defense in depth: pre-fix this was concatenated verbatim and produced a top-level `or`.
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler(
      {} as never,
      createMockRequest('local_metadata.host.hostname.keyword:*a) or (b*') as never,
      mockResponse
    );

    expect(mockListAgents).not.toHaveBeenCalled();
    // Generic message: parser internals must not leak to the client.
    expect(mockResponse.badRequest).toHaveBeenCalledWith({
      body: { message: 'Invalid search query' },
    });
  });

  it('rejects a malformed kuery without leaking parser internals', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler({} as never, createMockRequest('field:(unclosed') as never, mockResponse);

    expect(mockListAgents).not.toHaveBeenCalled();
    expect(mockResponse.badRequest).toHaveBeenCalledWith({
      body: { message: 'Invalid search query' },
    });
    const body = JSON.stringify(mockResponse.badRequest.mock.calls[0][0]);
    expect(body).not.toMatch(/Expected|peggy|KQLSyntaxError/);
  });
});
