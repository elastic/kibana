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
import { createDescribeApiTypeTool } from './describe_api_type';
import type { ApiDescribeTypeResultData } from './describe_api_type';
import { getRegistries } from '../../api/registry';
import type { ApiRegistry, ApiRegistryDefinition, LoadedApi } from '../../api';

jest.mock('../../api/registry', () => ({
  ...jest.requireActual('../../api/registry'),
  getRegistries: jest.fn(),
}));

const mockBigDescription = 'x'.repeat(2_000);

jest.mock('@elastic/schemas/es/json/_types.json', () => ({
  $defs: {
    Duration: { type: 'string', description: 'A duration such as "30s".' },
    QueryContainer: {
      type: 'object',
      description: 'x'.repeat(2_000),
      properties: {
        bool: { $ref: './_types.json#/$defs/BoolQuery' },
        term: { $ref: './_types.json#/$defs/OversizedTermQuery' },
      },
    },
    BoolQuery: {
      type: 'object',
      properties: { must: { $ref: './_types.json#/$defs/Duration' } },
    },
    OversizedTermQuery: { type: 'object', description: 'x'.repeat(2_000) },
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

const searchApi: ApiRegistryDefinition = {
  name: 'search',
  namespace: null,
  description: 'Run a search',
  method: 'POST',
  path: '/_search',
  input: {
    type: 'object',
    properties: { query: { $ref: './_types.json#/$defs/QueryContainer', 'x-found-in': 'body' } },
  },
  destructive: false,
};

describe('createDescribeApiTypeTool', () => {
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
    const tool = createDescribeApiTypeTool();
    expect(tool.id).toBe(internalTools.describeApiType);
  });

  it('returns the full definition of a type the API schema stubbed', async () => {
    loadApi.mockResolvedValue(createLoadedApi(searchApi));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'search', types: ['QueryContainer'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeTypeResultData;
    expect(data.type).toBe('QueryContainer');
    expect(data.schema_yaml).toContain('bool');
    expect(data.schema_yaml).toContain('$ref: "#/$defs/BoolQuery"');
    expect(data.schema_yaml).toContain(mockBigDescription);
  });

  it('stubs a nested type that is itself too large and reports it as expandable', async () => {
    loadApi.mockResolvedValue(createLoadedApi(searchApi));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'search', types: ['QueryContainer'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeTypeResultData;
    expect(data.expandable_types).toEqual(['OversizedTermQuery']);
    expect(data.schema_yaml).toContain('x-expandable: OversizedTermQuery');
  });

  it('strips the routing annotation the API schema carries', async () => {
    loadApi.mockResolvedValue(createLoadedApi(searchApi));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'search', types: ['BoolQuery'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDescribeTypeResultData;
    expect(data.schema_yaml).not.toContain('x-found-in');
    expect(data.expandable_types).toEqual([]);
  });

  it('describes every requested type in a single call, in the order requested', async () => {
    loadApi.mockResolvedValue(createLoadedApi(searchApi));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'search', types: ['BoolQuery', 'QueryContainer'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(2);
    expect(result.results.map((entry) => (entry.data as ApiDescribeTypeResultData).type)).toEqual([
      'BoolQuery',
      'QueryContainer',
    ]);
    expect(
      result.results.every(
        (entry) => (entry.data as ApiDescribeTypeResultData).schema_yaml.length > 0
      )
    ).toBe(true);
  });

  it('describes a repeated type name only once', async () => {
    loadApi.mockResolvedValue(createLoadedApi(searchApi));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'search', types: ['BoolQuery', 'BoolQuery'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    expect((result.results[0].data as ApiDescribeTypeResultData).type).toBe('BoolQuery');
  });

  it('returns the types it resolved alongside one error naming those it did not', async () => {
    loadApi.mockResolvedValue(createLoadedApi(searchApi));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      {
        target: 'elasticsearch',
        api: 'search',
        types: ['BoolQuery', 'NotAType', 'AlsoNotAType'],
      },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(2);
    expect((result.results[0].data as ApiDescribeTypeResultData).type).toBe('BoolQuery');

    expect(result.results[1].type).toBe(ToolResultType.error);
    const error = result.results[1].data as ErrorResultData;
    expect(error.message).toContain('references no types named "NotAType", "AlsoNotAType"');
  });

  it('bounds the number of types a single call may request', () => {
    const tool = createDescribeApiTypeTool();
    const base = { target: 'elasticsearch', api: 'search' };

    expect(tool.schema.safeParse({ ...base, types: [] }).success).toBe(false);
    expect(
      tool.schema.safeParse({ ...base, types: Array.from({ length: 21 }, () => 'BoolQuery') })
        .success
    ).toBe(false);
    expect(
      tool.schema.safeParse({ ...base, types: Array.from({ length: 20 }, () => 'BoolQuery') })
        .success
    ).toBe(true);
  });

  it('returns an error naming the type when the API references no such type', async () => {
    loadApi.mockResolvedValue(createLoadedApi(searchApi));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'search', types: ['NotAType'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('references no type named "NotAType"');
    expect(data.message).toContain(internalTools.describeApi);
  });

  it('returns an error when the API takes no parameters at all', async () => {
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

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'info', types: ['QueryContainer'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('takes no parameters');
  });

  it('returns an error when the schema references cannot be resolved', async () => {
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
    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'indices.create', types: ['Duration'] },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('Failed to load the type definitions');
    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to resolve schema references')
    );
  });

  it('returns a helpful error for an unknown API identifier', async () => {
    loadApi.mockRejectedValue(new UnknownApiError('does.not.exist'));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'does.not.exist', types: ['QueryContainer'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('Unknown API identifier');
  });

  it('returns an error result when loading fails for another reason', async () => {
    loadApi.mockRejectedValue(new Error('network down'));

    const tool = createDescribeApiTypeTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', api: 'search', types: ['QueryContainer'] },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('Failed to load API definition');
  });
});
