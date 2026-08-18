/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { agentBuilderMocks } from '../../../../../mocks';
import { createDiscoverApisTool } from './discover';
import type { ApiDiscoverResultData } from './discover';
import { getRegistries } from '../../api/registry';
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
  ...overrides,
});

const createRegistry = (manifest: ApiRegistryMeta[]): ApiRegistry => ({
  manifest,
  loadApi: jest.fn(),
});

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

  it('returns all APIs when no search is provided', async () => {
    const tool = createDiscoverApisTool();
    const result = (await tool.handler(
      { target: 'elasticsearch' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    const data = result.results[0].data as ApiDiscoverResultData;
    expect(data.total).toBe(3);
    expect(data.apis.map((entry) => entry.api)).toEqual([
      'indices.create',
      'bulk',
      'cluster.health',
    ]);
  });

  it('filters APIs by case-insensitive substring across name/namespace/description/id', async () => {
    const tool = createDiscoverApisTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', search: 'CLUSTER' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDiscoverResultData;
    expect(data.total).toBe(1);
    expect(data.apis[0]).toEqual({
      api: 'cluster.health',
      name: 'health',
      namespace: 'cluster',
      description: 'Return the health status of the cluster',
    });
  });

  it('maps root operations to a null namespace', async () => {
    const tool = createDiscoverApisTool();
    const result = (await tool.handler(
      { target: 'elasticsearch', search: 'bulk' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as ApiDiscoverResultData;
    expect(data.apis[0].namespace).toBeNull();
  });

  it('returns an error result when the schemas fail to load', async () => {
    mockGetRegistries.mockRejectedValue(new Error('boom'));

    const tool = createDiscoverApisTool();
    const result = (await tool.handler(
      { target: 'kibana' },
      agentBuilderMocks.tools.createHandlerContext()
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
  });
});
