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
import { createDiscoverApisTool } from './discover';
import type { ApiDiscoverResultData } from './discover';
import { getRegistries } from '../../api/registry';
import { DISCOVER_RESULT_LIMIT } from '../../api';
import type { ApiRegistry, ApiRegistryMeta } from '../../api';

jest.mock('../../api/registry', () => ({
  ...jest.requireActual('../../api/registry'),
  getRegistries: jest.fn(),
}));

const mockGetRegistries = jest.mocked(getRegistries);

const createMeta = (overrides: Partial<ApiRegistryMeta> = {}): ApiRegistryMeta => ({
  id: 'indices.create',
  name: 'create',
  namespace: 'indices',
  description: 'Create an index',
  namespaceFile: 'indices',
  destructive: false,
  readOnly: false,
  ...overrides,
});

const createRegistry = (manifest: ApiRegistryMeta[]): ApiRegistry => ({
  manifest,
  loadApi: jest.fn(),
});

const discover = async (search: string): Promise<ToolHandlerStandardReturn> =>
  (await createDiscoverApisTool().handler(
    { target: 'elasticsearch', search },
    agentBuilderMocks.tools.createHandlerContext()
  )) as ToolHandlerStandardReturn;

describe('createDiscoverApisTool', () => {
  const manifest = [
    createMeta({ id: 'indices.create', name: 'create', namespace: 'indices' }),
    createMeta({
      id: 'bulk',
      name: 'bulk',
      namespace: null,
      description: 'Perform multiple index/create/delete operations',
    }),
    createMeta({
      id: 'cluster.health',
      name: 'health',
      namespace: 'cluster',
      description: 'Return the health status of the cluster',
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRegistries.mockResolvedValue({
      elasticsearch: createRegistry(manifest),
      kibana: createRegistry([]),
    });
  });

  it('has the correct id', () => {
    const tool = createDiscoverApisTool();
    expect(tool.id).toBe(internalTools.discoverApis);
  });

  it('requires a search term', () => {
    const tool = createDiscoverApisTool();

    expect(tool.schema.safeParse({ target: 'elasticsearch' }).success).toBe(false);
    expect(
      tool.schema.safeParse({ target: 'elasticsearch', search: 'x'.repeat(501) }).success
    ).toBe(false);
  });

  it('returns an error result for a blank search', async () => {
    const result = await discover('   ');

    expect(result.results[0].type).toBe(ToolResultType.error);
    const data = result.results[0].data as ErrorResultData;
    expect(data.message).toContain('search is required');
  });

  it('ranks the APIs matching a multi-word query', async () => {
    const result = await discover('CLUSTER health status');

    expect(result.results[0].type).toBe(ToolResultType.other);
    const data = result.results[0].data as ApiDiscoverResultData;
    expect(data.apis).toHaveLength(1);
    expect(data.apis[0]).toEqual({
      api: 'cluster.health',
      name: 'health',
      namespace: 'cluster',
      description: 'Return the health status of the cluster',
    });
  });

  it(`returns at most ${DISCOVER_RESULT_LIMIT} APIs`, async () => {
    mockGetRegistries.mockResolvedValue({
      elasticsearch: createRegistry(
        Array.from({ length: DISCOVER_RESULT_LIMIT + 5 }, (_, index) =>
          createMeta({ id: `widgets.op${index}`, name: `op${index}`, namespace: 'widgets' })
        )
      ),
      kibana: createRegistry([]),
    });

    const data = (await discover('widgets')).results[0].data as ApiDiscoverResultData;

    expect(data.apis).toHaveLength(DISCOVER_RESULT_LIMIT);
  });

  it('returns an empty listing when nothing matches', async () => {
    const result = await discover('no-such-api');

    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({ target: 'elasticsearch', apis: [] });
  });

  it('maps root operations to a null namespace', async () => {
    const data = (await discover('bulk')).results[0].data as ApiDiscoverResultData;

    expect(data.apis[0]).toEqual(expect.objectContaining({ api: 'bulk', namespace: null }));
  });

  it('returns an error result when the schemas fail to load', async () => {
    mockGetRegistries.mockRejectedValue(new Error('boom'));

    const result = await discover('index');

    expect(result.results[0].type).toBe(ToolResultType.error);
  });
});
