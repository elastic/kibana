/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { AgentExecutionMode, ToolResultType } from '@kbn/agent-builder-common';
import type { AutoApprovedApi } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { AgentPromptType, ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { ErrorResultData } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { isToolHandlerInterruptReturn } from '@kbn/agent-builder-server/tools';
import { agentBuilderMocks } from '../../../../../mocks';
import { createExecuteApiTool } from './execute';
import type { ApiExecuteResultData } from './execute';
import { getRegistries } from '../../api/registry';
import type { ApiRegistry, ApiRegistryDefinition, ApiRequest, LoadedApi } from '../../api';

jest.mock('../../api/registry', () => ({
  ...jest.requireActual('../../api/registry'),
  getRegistries: jest.fn(),
}));

const mockGetRegistries = jest.mocked(getRegistries);

const createLoadedApi = (definition: ApiRegistryDefinition, apiRequest: ApiRequest): LoadedApi => ({
  definition,
  buildRequest: jest.fn().mockReturnValue(apiRequest),
});

const createRegistry = (loadApi: jest.Mock): ApiRegistry => ({
  manifest: [],
  loadApi,
});

class UnknownApiError extends Error {
  constructor(id: string) {
    super(`Unknown API: ${id}`);
    this.name = 'UnknownApiError';
  }
}

describe('createExecuteApiTool', () => {
  let selfClient: ReturnType<typeof httpServiceMock.createStartContract>['selfClient'];
  let mockFetch: jest.Mock;
  let esLoadApi: jest.Mock;
  let kibanaLoadApi: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    ({ selfClient } = httpServiceMock.createStartContract());
    mockFetch = jest.fn();
    jest.mocked(selfClient.asScoped).mockReturnValue({ fetch: mockFetch });

    esLoadApi = jest.fn();
    kibanaLoadApi = jest.fn();
    mockGetRegistries.mockResolvedValue({
      elasticsearch: createRegistry(esLoadApi),
      kibana: createRegistry(kibanaLoadApi),
    });
  });

  it('has the correct id and no confirmation policy', () => {
    const tool = createExecuteApiTool({ selfClient });
    expect(tool.id).toBe(internalTools.executeApi);
    expect(tool.confirmation).toBeUndefined();
  });

  it('executes an Elasticsearch API via the current-user transport client', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'create',
          namespace: 'indices',
          description: 'Create an index',
          method: 'PUT',
          path: '/my-index',
          destructive: false,
        },
        { method: 'PUT', path: '/my-index', body: { settings: { number_of_shards: 1 } } }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);
    transportRequest.mockResolvedValue({ acknowledged: true });

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create', params: { settings: {} } },
      context
    )) as ToolHandlerStandardReturn;

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/my-index',
      body: { settings: { number_of_shards: 1 } },
    });
    expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
    const data = result.results[0].data as ApiExecuteResultData;
    expect(data.response).toEqual({ acknowledged: true });
  });

  it('executes a public Kibana API via the scoped self client', async () => {
    kibanaLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'status',
          namespace: null,
          description: 'Kibana status',
          method: 'GET',
          path: '/api/status',
          destructive: false,
        },
        { method: 'GET', path: '/api/status', querystring: { v8format: true } }
      )
    );
    mockFetch.mockResolvedValue({ status: 'green' });

    const context = agentBuilderMocks.tools.createHandlerContext();
    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'kibana', api: 'status', params: {} },
      context
    )) as ToolHandlerStandardReturn;

    expect(selfClient.asScoped).toHaveBeenCalledWith(context.request);
    expect(mockFetch).toHaveBeenCalledWith('/api/status', {
      method: 'GET',
      query: { v8format: true },
      body: undefined,
      access: 'public',
    });
    const data = result.results[0].data as ApiExecuteResultData;
    expect(data.response).toEqual({ status: 'green' });
  });

  it('routes /internal Kibana paths with internal access', async () => {
    kibanaLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'internal_thing',
          namespace: null,
          description: 'Internal API',
          method: 'POST',
          path: '/internal/foo',
          destructive: false,
        },
        { method: 'POST', path: '/internal/foo', body: { a: 1 } }
      )
    );
    mockFetch.mockResolvedValue({});

    const context = agentBuilderMocks.tools.createHandlerContext();
    const tool = createExecuteApiTool({ selfClient });
    await tool.handler({ target: 'kibana', api: 'internal_thing', params: {} }, context);

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/foo',
      expect.objectContaining({ access: 'internal', body: { a: 1 } })
    );
  });

  it('sends the built path for an API with path parameters', async () => {
    const loaded = createLoadedApi(
      {
        name: 'get',
        namespace: 'data-views',
        description: 'Get a data view',
        method: 'GET',
        path: '/api/data_views/data_view/{viewId}',
        input: {
          type: 'object',
          properties: { viewId: { type: 'string', 'x-found-in': 'path' } },
          required: ['viewId'],
        },
        destructive: false,
      },
      { method: 'GET', path: '/api/data_views/data_view/logs' }
    );
    kibanaLoadApi.mockResolvedValue(loaded);
    mockFetch.mockResolvedValue({});

    const tool = createExecuteApiTool({ selfClient });
    await tool.handler(
      { target: 'kibana', api: 'data-views.get', params: { viewId: 'logs' } },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(loaded.buildRequest).toHaveBeenCalledWith({ viewId: 'logs' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/data_views/data_view/logs',
      expect.objectContaining({ method: 'GET', access: 'public' })
    );
  });

  describe('SLO paths, whose spec hardcodes a space prefix', () => {
    const sloApi = (path: string, builtPath: string) =>
      createLoadedApi(
        {
          name: 'find-slos-op',
          namespace: 'slo',
          description: 'Get a paginated list of SLOs',
          method: 'GET',
          path,
          destructive: false,
        },
        { method: 'GET', path: builtPath }
      );

    it('strips the space prefix so the self client applies the current space', async () => {
      kibanaLoadApi.mockResolvedValue(
        sloApi('/s/{spaceId}/api/observability/slos', '/s/default/api/observability/slos')
      );
      mockFetch.mockResolvedValue({ total: 0 });

      const tool = createExecuteApiTool({ selfClient });
      const result = (await tool.handler(
        { target: 'kibana', api: 'slo.find-slos-op', params: { spaceId: 'default' } },
        agentBuilderMocks.tools.createHandlerContext()
      )) as ToolHandlerStandardReturn;

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/observability/slos',
        expect.objectContaining({ access: 'public' })
      );
      const data = result.results[0].data as ApiExecuteResultData;
      expect(data.path).toBe('/api/observability/slos');
    });

    it('refuses a call aimed at a space other than the current one', async () => {
      kibanaLoadApi.mockResolvedValue(
        sloApi('/s/{spaceId}/api/observability/slos', '/s/marketing/api/observability/slos')
      );

      const tool = createExecuteApiTool({ selfClient });
      const result = (await tool.handler(
        { target: 'kibana', api: 'slo.find-slos-op', params: { spaceId: 'marketing' } },
        agentBuilderMocks.tools.createHandlerContext()
      )) as ToolHandlerStandardReturn;

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.results[0].type).toBe(ToolResultType.error);
      const data = result.results[0].data as ErrorResultData;
      expect(data.message).toContain('space "marketing"');
      expect(data.message).toContain('"default"');
    });

    it('reports the missing space param rather than sending braces to the server', async () => {
      kibanaLoadApi.mockResolvedValue(
        sloApi('/s/{spaceId}/api/observability/slos', '/s/{spaceId}/api/observability/slos')
      );

      const tool = createExecuteApiTool({ selfClient });
      const result = (await tool.handler(
        { target: 'kibana', api: 'slo.find-slos-op', params: {} },
        agentBuilderMocks.tools.createHandlerContext()
      )) as ToolHandlerStandardReturn;

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.results[0].type).toBe(ToolResultType.error);
      const data = result.results[0].data as ErrorResultData;
      expect(data.message).toContain('"spaceId"');
    });

    it('detects internal access from the path behind the space prefix', async () => {
      kibanaLoadApi.mockResolvedValue(
        sloApi(
          '/s/{spaceId}/internal/observability/slos/_definitions',
          '/s/default/internal/observability/slos/_definitions'
        )
      );
      mockFetch.mockResolvedValue({});

      const tool = createExecuteApiTool({ selfClient });
      await tool.handler(
        { target: 'kibana', api: 'slo.get-definitions-op', params: {} },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(mockFetch).toHaveBeenCalledWith(
        '/internal/observability/slos/_definitions',
        expect.objectContaining({ access: 'internal' })
      );
    });
  });

  it('returns a helpful error for an unknown API identifier', async () => {
    esLoadApi.mockRejectedValue(new UnknownApiError('nope'));

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'nope', params: {} },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('Unknown API identifier');
  });

  it('reports params the validator rejected and points at the describe tool', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'create',
          namespace: 'indices',
          description: 'Create an index',
          method: 'PUT',
          path: '/{index}',
          input: {
            type: 'object',
            properties: { index: { type: 'string' } },
            required: ['index'],
          },
          destructive: false,
        },
        { method: 'PUT', path: '/42' }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create', params: { index: 42 } },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('Invalid params');
    expect(data.message).toContain('#/index');
    expect(data.message).toContain(internalTools.describeApi);
    expect(transportRequest).not.toHaveBeenCalled();
  });

  it('validates against the real shared schemas that an input $refs', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'health',
          namespace: 'cluster',
          description: 'Get the cluster health status',
          method: 'GET',
          path: '/_cluster/health',
          input: {
            type: 'object',
            properties: {
              timeout: { $ref: './_types.json#/$defs/_types__Duration' },
            },
          },
          destructive: false,
        },
        { method: 'GET', path: '/_cluster/health' }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'cluster.health', params: { timeout: '30s' } },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).not.toBe(ToolResultType.error);
    expect(context.esClient.asCurrentUser.transport.request).toHaveBeenCalled();
  });

  it('refuses a schema reference that points outside the schemas package', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'create',
          namespace: 'indices',
          description: 'Create an index',
          method: 'PUT',
          path: '/{index}',
          input: {
            type: 'object',
            properties: { index: { $ref: '../../../etc/passwd.json#/$defs/x' } },
          },
          destructive: false,
        },
        { method: 'PUT', path: '/my-index' }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create', params: { index: 'my-index' } },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('parameter schema could not be loaded');
    expect(transportRequest).not.toHaveBeenCalled();
    expect(context.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('failed to build the params validator for "indices.create"')
    );
  });

  it('refuses to send a path whose parameters were left unresolved', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'indices',
          namespace: 'cat',
          description: 'Get index information',
          method: 'GET',
          path: '/_cat/indices/{index}',
          input: {
            type: 'object',
            properties: {
              index: { type: 'string', 'x-found-in': 'path' },
              format: { type: 'string', 'x-found-in': 'query' },
            },
          },
          destructive: false,
        },
        { method: 'GET', path: '/_cat/indices/{index}', querystring: { format: 'json' } }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'cat.indices', params: { format: 'json' } },
      context
    )) as ToolHandlerStandardReturn;

    expect(transportRequest).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('"index"');
    expect(data.message).toContain(internalTools.describeApi);
  });

  it('does not ask the user to confirm a destructive call it cannot build', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'delete',
          namespace: 'indices',
          description: 'Delete an index',
          method: 'DELETE',
          path: '/{index}',
          destructive: true,
        },
        { method: 'DELETE', path: '/{index}' }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.delete', params: {} },
      context
    )) as ToolHandlerStandardReturn;

    expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
    expect(result.results[0].type).toBe(ToolResultType.error);
  });

  it('sends a body-root payload as the body rather than under its parameter name', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'index',
          namespace: null,
          description: 'Index a document',
          method: 'PUT',
          path: '/logs/_doc/1',
          input: {
            type: 'object',
            properties: {
              document: { 'x-found-in': 'body', 'x-body-root': true },
            },
          },
          destructive: false,
        },
        { method: 'PUT', path: '/logs/_doc/1', body: { document: { field: 1 } } }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);
    transportRequest.mockResolvedValue({ result: 'created' });

    const tool = createExecuteApiTool({ selfClient });
    await tool.handler(
      { target: 'elasticsearch', api: 'index', params: { document: { field: 1 } } },
      context
    );

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/logs/_doc/1',
      body: { field: 1 },
    });
  });

  it('sends a Kibana body-root payload as the body itself', async () => {
    kibanaLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'create-case',
          namespace: 'cases',
          description: 'Create a case',
          method: 'POST',
          path: '/api/cases',
          input: {
            type: 'object',
            properties: { body: { 'x-found-in': 'body', 'x-body-root': true } },
          },
          destructive: false,
        },
        { method: 'POST', path: '/api/cases', body: { body: { title: 'Investigation' } } }
      )
    );
    mockFetch.mockResolvedValue({ id: 'case-1' });

    const context = agentBuilderMocks.tools.createHandlerContext();
    const tool = createExecuteApiTool({ selfClient });
    await tool.handler(
      { target: 'kibana', api: 'cases.create-case', params: { body: { title: 'Investigation' } } },
      context
    );

    expect(mockFetch).toHaveBeenCalledWith('/api/cases', {
      method: 'POST',
      query: undefined,
      body: { title: 'Investigation' },
      access: 'public',
    });
  });

  it('executes an NDJSON API by serializing its payload into newline-delimited lines', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'bulk',
          namespace: null,
          description: 'Bulk operations',
          method: 'POST',
          path: '/_bulk',
          bodyFormat: 'ndjson',
          input: {
            type: 'object',
            properties: {
              operations: { type: 'array', 'x-found-in': 'body', 'x-body-root': true },
            },
          },
          destructive: false,
        },
        {
          method: 'POST',
          path: '/_bulk',
          bulkBody: { operations: [{ index: { _index: 'logs' } }, { field: 1 }] },
        }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);
    transportRequest.mockResolvedValue({ errors: false });

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      {
        target: 'elasticsearch',
        api: 'bulk',
        params: { operations: [{ index: { _index: 'logs' } }, { field: 1 }] },
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_bulk',
      bulkBody: '{"index":{"_index":"logs"}}\n{"field":1}\n',
    });
    const data = result.results[0].data as ApiExecuteResultData;
    expect(data.response).toEqual({ errors: false });
  });

  it('passes the raw text lines of an NDJSON payload through unquoted', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'find_structure',
          namespace: 'text_structure',
          description: 'Find the structure of some text',
          method: 'POST',
          path: '/_text_structure/find_structure',
          bodyFormat: 'ndjson',
          input: {
            type: 'object',
            properties: {
              text_files: { type: 'array', 'x-found-in': 'body', 'x-body-root': true },
            },
          },
          destructive: false,
        },
        {
          method: 'POST',
          path: '/_text_structure/find_structure',
          bulkBody: { text_files: ['first,line', 'second,line'] },
        }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);
    transportRequest.mockResolvedValue({ num_lines_analyzed: 2 });

    const tool = createExecuteApiTool({ selfClient });
    await tool.handler(
      {
        target: 'elasticsearch',
        api: 'text_structure.find_structure',
        params: { text_files: ['first,line', 'second,line'] },
      },
      context
    );

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_text_structure/find_structure',
      bulkBody: 'first,line\nsecond,line\n',
    });
  });

  it('returns an error result when the request fails', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'health',
          namespace: 'cluster',
          description: 'Cluster health',
          method: 'GET',
          path: '/_cluster/health',
          destructive: false,
        },
        { method: 'GET', path: '/_cluster/health' }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);
    transportRequest.mockRejectedValue(new Error('cluster unavailable'));

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'cluster.health', params: {} },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('API request failed');
  });

  it('surfaces the status code and response body of a failed request', async () => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'create',
          namespace: 'indices',
          description: 'Create an index',
          method: 'PUT',
          path: '/my-index',
          destructive: false,
        },
        { method: 'PUT', path: '/my-index' }
      )
    );

    const responseError = Object.assign(new Error('resource_already_exists_exception'), {
      statusCode: 400,
      body: { error: { type: 'resource_already_exists_exception', index: 'my-index' } },
    });

    const context = agentBuilderMocks.tools.createHandlerContext();
    jest.mocked(context.esClient.asCurrentUser.transport.request).mockRejectedValue(responseError);

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create', params: {} },
      context
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ErrorResultData;
    expect(data.metadata).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: { error: { type: 'resource_already_exists_exception', index: 'my-index' } },
      })
    );
  });

  it('surfaces the status code of a failed Kibana call, which reports it on the response', async () => {
    kibanaLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'status',
          namespace: '',
          description: 'Kibana status',
          method: 'GET',
          path: '/api/status',
          destructive: false,
        },
        { method: 'GET', path: '/api/status' }
      )
    );

    const selfFetchError = Object.assign(new Error('Forbidden'), {
      name: 'HttpSelfFetchError',
      response: { status: 403 },
      body: { message: 'Forbidden' },
    });
    mockFetch.mockRejectedValue(selfFetchError);

    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'kibana', api: 'status', params: {} },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ErrorResultData;
    expect(data.metadata).toEqual(
      expect.objectContaining({ statusCode: 403, body: { message: 'Forbidden' } })
    );
  });

  it.each<{ description: string; queryParams: Record<string, unknown>; param: string }>([
    {
      description: 'an object, which would be sent as "[object Object]"',
      queryParams: { master_timeout: { gte: 1 } },
      param: 'master_timeout',
    },
    {
      description: 'an array with a nullish member, which would be sent as the text "null"',
      queryParams: { type: ['dashboard', null] },
      param: 'type',
    },
  ])('refuses a query param with $description', async ({ queryParams: querystring, param }) => {
    esLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'health',
          namespace: 'cluster',
          description: 'Cluster health',
          method: 'GET',
          path: '/_cluster/health',
          destructive: false,
        },
        { method: 'GET', path: '/_cluster/health', querystring }
      )
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const tool = createExecuteApiTool({ selfClient });
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'cluster.health', params: querystring },
      context
    )) as ToolHandlerStandardReturn;

    expect(context.esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain(`"${param}"`);
    expect(data.message).toContain('Query parameters only accept');
  });

  it('still sends scalar and array query params', async () => {
    kibanaLoadApi.mockResolvedValue(
      createLoadedApi(
        {
          name: 'find',
          namespace: 'saved_objects',
          description: 'Find saved objects',
          method: 'GET',
          path: '/api/saved_objects/_find',
          destructive: false,
        },
        {
          method: 'GET',
          path: '/api/saved_objects/_find',
          querystring: { type: ['dashboard', 'lens'], per_page: 20, has_reference: null },
        }
      )
    );
    mockFetch.mockResolvedValue({ total: 0 });

    const tool = createExecuteApiTool({ selfClient });
    await tool.handler(
      { target: 'kibana', api: 'saved_objects.find', params: {} },
      agentBuilderMocks.tools.createHandlerContext()
    );

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/saved_objects/_find',
      expect.objectContaining({
        query: { type: ['dashboard', 'lens'], per_page: 20, has_reference: null },
      })
    );
  });

  describe('destructive APIs', () => {
    const deleteIndexApi = () =>
      createLoadedApi(
        {
          name: 'delete',
          namespace: 'indices',
          description: 'Delete an index',
          method: 'DELETE',
          path: '/{index}',
          destructive: true,
        },
        { method: 'DELETE', path: '/my-index' }
      );

    const deleteIndexParams = {
      target: 'elasticsearch',
      api: 'indices.delete',
      params: { index: 'my-index' },
    } as const;

    it('asks the user to confirm before running the call', async () => {
      esLoadApi.mockResolvedValue(deleteIndexApi());

      const context = agentBuilderMocks.tools.createHandlerContext();
      context.prompts.checkConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.unprompted,
      });
      context.prompts.askForConfirmation.mockImplementation((confirm) => ({
        prompt: { type: AgentPromptType.confirmation, ...confirm },
      }));
      const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);

      const tool = createExecuteApiTool({ selfClient });
      const result = await tool.handler(deleteIndexParams, context);

      expect(transportRequest).not.toHaveBeenCalled();
      expect(isToolHandlerInterruptReturn(result)).toBe(true);
      expect(context.prompts.askForConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${internalTools.executeApi}.${context.callContext.toolCallId}`,
          message: expect.stringContaining('DELETE /my-index'),
        })
      );
    });

    it('executes the call once the user has accepted', async () => {
      esLoadApi.mockResolvedValue(deleteIndexApi());

      const context = agentBuilderMocks.tools.createHandlerContext();
      context.prompts.checkConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.accepted,
      });
      const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);
      transportRequest.mockResolvedValue({ acknowledged: true });

      const tool = createExecuteApiTool({ selfClient });
      const result = (await tool.handler(deleteIndexParams, context)) as ToolHandlerStandardReturn;

      expect(transportRequest).toHaveBeenCalledWith({ method: 'DELETE', path: '/my-index' });
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      const data = result.results[0].data as ApiExecuteResultData;
      expect(data.response).toEqual({ acknowledged: true });
    });

    it('does not run a call the user declined', async () => {
      esLoadApi.mockResolvedValue(deleteIndexApi());

      const context = agentBuilderMocks.tools.createHandlerContext();
      context.prompts.checkConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.rejected,
      });
      const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);

      const tool = createExecuteApiTool({ selfClient });
      const result = (await tool.handler(deleteIndexParams, context)) as ToolHandlerStandardReturn;

      expect(transportRequest).not.toHaveBeenCalled();
      expect(result.results[0].type).toBe(ToolResultType.error);
      const data = result.results[0].data as ErrorResultData;
      expect(data.message).toContain('declined');
    });

    it('refuses the call in a non-interactive execution, where nobody can confirm it', async () => {
      esLoadApi.mockResolvedValue(deleteIndexApi());

      const context = {
        ...agentBuilderMocks.tools.createHandlerContext(),
        executionMode: AgentExecutionMode.standalone,
      };
      const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);

      const tool = createExecuteApiTool({ selfClient });
      const result = (await tool.handler(deleteIndexParams, context)) as ToolHandlerStandardReturn;

      expect(transportRequest).not.toHaveBeenCalled();
      expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
      expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
      expect(result.results[0].type).toBe(ToolResultType.error);
      const data = result.results[0].data as ErrorResultData;
      expect(data.message).toContain('non-interactive');
    });

    it('records that the user confirmed the call', async () => {
      esLoadApi.mockResolvedValue(deleteIndexApi());

      const context = agentBuilderMocks.tools.createHandlerContext();
      context.prompts.checkConfirmationStatus.mockReturnValue({
        status: ConfirmationStatus.accepted,
      });
      jest
        .mocked(context.esClient.asCurrentUser.transport.request)
        .mockResolvedValue({ acknowledged: true });

      const tool = createExecuteApiTool({ selfClient });
      const result = (await tool.handler(deleteIndexParams, context)) as ToolHandlerStandardReturn;

      const data = result.results[0].data as ApiExecuteResultData;
      expect(data.approval).toBe('user_confirmed');
    });

    it('leaves the approval unset for a non-destructive call', async () => {
      esLoadApi.mockResolvedValue(
        createLoadedApi(
          {
            name: 'health',
            namespace: 'cluster',
            description: 'Cluster health',
            method: 'GET',
            path: '/_cluster/health',
            destructive: false,
          },
          { method: 'GET', path: '/_cluster/health' }
        )
      );

      const context = agentBuilderMocks.tools.createHandlerContext();
      jest.mocked(context.esClient.asCurrentUser.transport.request).mockResolvedValue({});

      const tool = createExecuteApiTool({ selfClient });
      const result = (await tool.handler(
        { target: 'elasticsearch', api: 'cluster.health', params: {} },
        context
      )) as ToolHandlerStandardReturn;

      const data = result.results[0].data as ApiExecuteResultData;
      expect(data.approval).toBeUndefined();
    });

    describe('pre-approved by the execution', () => {
      const withInteractivity = ({
        executionMode,
        enabled,
        autoApprovedApis = [],
      }: {
        executionMode: AgentExecutionMode;
        enabled: boolean;
        autoApprovedApis?: AutoApprovedApi[];
      }) => ({
        ...agentBuilderMocks.tools.createHandlerContext(),
        executionMode,
        interactivity: { enabled, auto_approved_apis: autoApprovedApis },
      });

      const covered: AutoApprovedApi[] = [{ target: 'elasticsearch', api: 'indices.delete' }];

      it.each<{ description: string; executionMode: AgentExecutionMode; enabled: boolean }>([
        {
          description: 'a standalone execution',
          executionMode: AgentExecutionMode.standalone,
          enabled: false,
        },
        {
          description: 'an interactive conversation',
          executionMode: AgentExecutionMode.conversation,
          enabled: true,
        },
        {
          description: 'a non-interactive conversation, as an ai.agent workflow step runs',
          executionMode: AgentExecutionMode.conversation,
          enabled: false,
        },
      ])(
        'runs a covered destructive API in $description, without prompting',
        async ({ executionMode, enabled }) => {
          esLoadApi.mockResolvedValue(deleteIndexApi());

          const context = withInteractivity({
            executionMode,
            enabled,
            autoApprovedApis: covered,
          });
          const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);
          transportRequest.mockResolvedValue({ acknowledged: true });

          const tool = createExecuteApiTool({ selfClient });
          const result = (await tool.handler(
            deleteIndexParams,
            context
          )) as ToolHandlerStandardReturn;

          expect(transportRequest).toHaveBeenCalledWith({ method: 'DELETE', path: '/my-index' });
          expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
          expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
          const data = result.results[0].data as ApiExecuteResultData;
          expect(data.approval).toBe('pre_approved');
        }
      );

      it.each<{ description: string; executionMode: AgentExecutionMode }>([
        { description: 'a standalone execution', executionMode: AgentExecutionMode.standalone },
        {
          description: 'a non-interactive conversation, as an ai.agent workflow step runs',
          executionMode: AgentExecutionMode.conversation,
        },
      ])(
        'refuses an uncovered destructive API in $description, pointing at the pre-approval',
        async ({ executionMode }) => {
          esLoadApi.mockResolvedValue(deleteIndexApi());

          const context = withInteractivity({
            executionMode,
            enabled: false,
            autoApprovedApis: [{ target: 'elasticsearch', api: 'indices.create' }],
          });
          const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);

          const tool = createExecuteApiTool({ selfClient });
          const result = (await tool.handler(
            deleteIndexParams,
            context
          )) as ToolHandlerStandardReturn;

          expect(transportRequest).not.toHaveBeenCalled();
          expect(context.prompts.checkConfirmationStatus).not.toHaveBeenCalled();
          expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
          expect(result.results[0].type).toBe(ToolResultType.error);
          const data = result.results[0].data as ErrorResultData;
          expect(data.message).toContain('pre-approve');
          expect(data.message).toContain('indices.delete');
        }
      );

      it.each<{ description: string; autoApprovedApis: AutoApprovedApi[] }>([
        {
          description: 'a namespace wildcard',
          autoApprovedApis: [{ target: 'elasticsearch', api: 'indices.*' }],
        },
        {
          description: 'the full wildcard',
          autoApprovedApis: [{ target: 'elasticsearch', api: '*' }],
        },
      ])(
        'runs a destructive API covered by $description, without prompting',
        async ({ autoApprovedApis }) => {
          esLoadApi.mockResolvedValue(deleteIndexApi());

          const context = withInteractivity({
            executionMode: AgentExecutionMode.conversation,
            enabled: false,
            autoApprovedApis,
          });
          const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);
          transportRequest.mockResolvedValue({ acknowledged: true });

          const tool = createExecuteApiTool({ selfClient });
          const result = (await tool.handler(
            deleteIndexParams,
            context
          )) as ToolHandlerStandardReturn;

          expect(transportRequest).toHaveBeenCalledWith({ method: 'DELETE', path: '/my-index' });
          expect(context.prompts.askForConfirmation).not.toHaveBeenCalled();
          const data = result.results[0].data as ApiExecuteResultData;
          expect(data.approval).toBe('pre_approved');
        }
      );

      it('does not let a wildcard for one target cover the other', async () => {
        esLoadApi.mockResolvedValue(deleteIndexApi());

        const context = withInteractivity({
          executionMode: AgentExecutionMode.conversation,
          enabled: false,
          autoApprovedApis: [{ target: 'kibana', api: '*' }],
        });
        const transportRequest = jest.mocked(context.esClient.asCurrentUser.transport.request);

        const tool = createExecuteApiTool({ selfClient });
        const result = (await tool.handler(
          deleteIndexParams,
          context
        )) as ToolHandlerStandardReturn;

        expect(transportRequest).not.toHaveBeenCalled();
        expect(result.results[0].type).toBe(ToolResultType.error);
      });

      it('still asks for confirmation in an interactive conversation the grant does not cover', async () => {
        esLoadApi.mockResolvedValue(deleteIndexApi());

        const context = withInteractivity({
          executionMode: AgentExecutionMode.conversation,
          enabled: true,
          autoApprovedApis: [{ target: 'kibana', api: 'indices.delete' }],
        });
        context.prompts.checkConfirmationStatus.mockReturnValue({
          status: ConfirmationStatus.unprompted,
        });
        context.prompts.askForConfirmation.mockImplementation((confirm) => ({
          prompt: { type: AgentPromptType.confirmation, ...confirm },
        }));

        const tool = createExecuteApiTool({ selfClient });
        const result = await tool.handler(deleteIndexParams, context);

        expect(isToolHandlerInterruptReturn(result)).toBe(true);
        expect(context.prompts.askForConfirmation).toHaveBeenCalled();
      });

      it('records the pre-approval on the error when the call itself fails', async () => {
        esLoadApi.mockResolvedValue(deleteIndexApi());

        const context = withInteractivity({
          executionMode: AgentExecutionMode.standalone,
          enabled: false,
          autoApprovedApis: covered,
        });
        jest
          .mocked(context.esClient.asCurrentUser.transport.request)
          .mockRejectedValue(new Error('index_not_found_exception'));

        const tool = createExecuteApiTool({ selfClient });
        const result = (await tool.handler(
          deleteIndexParams,
          context
        )) as ToolHandlerStandardReturn;

        expect(result.results[0].type).toBe(ToolResultType.error);
        const data = result.results[0].data as ErrorResultData;
        expect(data.metadata).toEqual(expect.objectContaining({ approval: 'pre_approved' }));
      });
    });
  });
});
