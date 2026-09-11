/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { ErrorResultData } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { agentBuilderMocks } from '../../../../../mocks';
import { createDescribeApiTool } from './describe';
import type { ApiDescribeResultData } from './describe';
import { getRegistries } from '../../api/registry';
import type { ApiRegistry, ApiRegistryDefinition, LoadedApi } from '../../api';

jest.mock('../../api/registry', () => ({
  ...jest.requireActual('../../api/registry'),
  getRegistries: jest.fn(),
}));

jest.mock('@elastic/schemas/es/json/_types.json', () => ({
  $defs: {
    Oversized: {
      type: 'object',
      description: 'x'.repeat(2_000),
      properties: { bool: { type: 'object' }, term: { type: 'object' } },
    },
  },
}));

const mockGetRegistries = jest.mocked(getRegistries);

const createLoadedApi = (definition: ApiRegistryDefinition): LoadedApi => ({
  definition,
  buildRequest: jest.fn(),
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

describe('createDescribeApiTool', () => {
  let loadApi: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    loadApi = jest.fn();
    mockGetRegistries.mockResolvedValue({
      elasticsearch: createRegistry(loadApi),
      kibana: createRegistry(jest.fn()),
    });
  });

  it('has the correct id', () => {
    const tool = createDescribeApiTool();
    expect(tool.id).toBe(internalTools.describeApi);
  });

  it('returns method, path, description and a YAML params schema', async () => {
    loadApi.mockResolvedValue(
      createLoadedApi({
        name: 'create',
        namespace: 'indices',
        description: 'Create an index',
        method: 'PUT',
        path: '/{index}',
        input: {
          type: 'object',
          properties: {
            index: { type: 'string', description: 'Name of the index.', 'x-found-in': 'path' },
          },
        },
        destructive: false,
      })
    );

    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeResultData;
    expect(data.method).toBe('PUT');
    expect(data.path).toBe('/{index}');
    expect(data.destructive).toBe(false);
    expect(data.params_schema_yaml).toContain('description: Name of the index.');
    expect(data.expandable_types).toEqual([]);
  });

  it('lists the types the schema was too large to output', async () => {
    loadApi.mockResolvedValue(
      createLoadedApi({
        name: 'search',
        namespace: null,
        description: 'Run a search',
        method: 'POST',
        path: '/_search',
        input: {
          type: 'object',
          properties: { query: { $ref: './_types.json#/$defs/Oversized' } },
        },
        destructive: false,
      })
    );

    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'search' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeResultData;
    expect(data.expandable_types).toEqual(['Oversized']);
    expect(data.params_schema_yaml).toContain('x-expandable: Oversized');
    expect(data.params_schema_yaml).toContain('x-properties');
  });

  it('presents one flat parameter set rather than where each value is routed', async () => {
    loadApi.mockResolvedValue(
      createLoadedApi({
        name: 'create',
        namespace: 'indices',
        description: 'Create an index',
        method: 'PUT',
        path: '/{index}',
        input: {
          type: 'object',
          properties: {
            index: { type: 'string', 'x-found-in': 'path' },
            timeout: { type: 'string', 'x-found-in': 'query' },
            mappings: { type: 'object', 'x-found-in': 'body' },
          },
        },
        destructive: false,
      })
    );

    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeResultData;
    expect(data.params_schema_yaml).not.toContain('x-found-in');
    expect(data.params_schema_yaml).toContain('index');
    expect(data.params_schema_yaml).toContain('timeout');
    expect(data.params_schema_yaml).toContain('mappings');
  });

  it('presents the payload of an NDJSON API as a parameter', async () => {
    loadApi.mockResolvedValue(
      createLoadedApi({
        name: 'bulk',
        namespace: null,
        description: 'Bulk index or delete documents',
        method: 'POST',
        path: '/_bulk',
        bodyFormat: 'ndjson',
        input: {
          type: 'object',
          properties: {
            operations: {
              type: 'array',
              description: 'The operations to perform.',
              'x-found-in': 'body',
              'x-body-root': true,
            },
          },
        },
        destructive: true,
      })
    );

    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'bulk' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeResultData;
    expect(data.params_schema_yaml).toContain('operations');
    expect(data.params_schema_yaml).toContain('description: The operations to perform.');
    expect(data.params_schema_yaml).not.toContain('x-body-root');
  });

  it('falls back to the raw schema when references cannot be resolved', async () => {
    loadApi.mockResolvedValue(
      createLoadedApi({
        name: 'create',
        namespace: 'indices',
        description: 'Create an index',
        method: 'PUT',
        path: '/{index}',
        input: {
          type: 'object',
          properties: { timeout: { $ref: '../outside.json#/$defs/Duration' } },
        },
        destructive: false,
      })
    );

    const context = agentBuilderMocks.tools.createHandlerContext();
    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create' },
      context
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeResultData;
    expect(data.params_schema_yaml).toContain('$ref');
    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to resolve schema references')
    );
  });

  it('surfaces the destructive flag so the model can anticipate the confirmation', async () => {
    loadApi.mockResolvedValue(
      createLoadedApi({
        name: 'delete',
        namespace: 'indices',
        description: 'Delete an index',
        method: 'DELETE',
        path: '/{index}',
        destructive: true,
      })
    );

    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.delete' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeResultData;
    expect(data.destructive).toBe(true);
  });

  it('reports when an API has no parameters', async () => {
    loadApi.mockResolvedValue(
      createLoadedApi({
        name: 'info',
        namespace: null,
        description: 'Cluster info',
        method: 'GET',
        path: '/',
        destructive: false,
      })
    );

    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'info' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeResultData;
    expect(data.params_schema_yaml).toContain('no parameters');
  });

  it('returns a helpful error for an unknown API identifier', async () => {
    loadApi.mockRejectedValue(new UnknownApiError('does.not.exist'));

    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'does.not.exist' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('Unknown API identifier');
  });

  it('returns an error result when loading fails for another reason', async () => {
    loadApi.mockRejectedValue(new Error('network down'));

    const tool = createDescribeApiTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('Failed to load API definition');
  });
});
