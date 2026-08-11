/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerReturn } from '@kbn/agent-builder-server/tools/handler';
import { createListIlmPoliciesTool } from './list_ilm_policies';
import {
  createMockGetScopedClients,
  createMockToolContext,
  mockEsMethodResolvedValue,
} from '../../utils/test_helpers';

interface ListIlmPoliciesResultData {
  ilm_available: boolean;
  reason?: string;
  policy_count?: number;
  policies: Array<{
    name: string;
    phases: Record<string, unknown>;
    managed: boolean;
    deprecated: boolean;
    in_use_by_streams: string[];
    in_use_by_indices: string[];
  }>;
}

const getData = (result: ToolHandlerReturn): ListIlmPoliciesResultData => {
  if (!('results' in result)) throw new Error('Expected results');
  return result.results[0].data as ListIlmPoliciesResultData;
};

describe('createListIlmPoliciesTool handler', () => {
  const setup = ({ isServerless = false } = {}) => {
    const { getScopedClients, esClient, scopedClusterClient } = createMockGetScopedClients();
    const tool = createListIlmPoliciesTool({ getScopedClients, isServerless });
    const context = createMockToolContext();
    return { tool, context, esClient, scopedClusterClient };
  };

  it('returns ilm_available: false on serverless without calling ES', async () => {
    const { tool, context, esClient } = setup({ isServerless: true });

    const result = await tool.handler({}, context);

    const data = getData(result);
    expect(data.ilm_available).toBe(false);
    expect(data.reason).toContain('serverless');
    expect(data.policies).toEqual([]);
    expect(esClient.ilm.getLifecycle).not.toHaveBeenCalled();
  });

  it('returns policies with phase summaries and usage on stateful', async () => {
    const { tool, context, esClient } = setup();

    mockEsMethodResolvedValue(esClient.ilm.getLifecycle, {
      'logs-default': {
        policy: {
          phases: {
            hot: { min_age: '0ms', actions: {} },
            warm: { min_age: '7d', actions: {} },
            delete: { min_age: '30d', actions: { delete: {} } },
          },
        },
        in_use_by: {
          indices: ['.ds-logs-nginx-000001', 'standalone-index'],
          data_streams: ['logs-nginx'],
        },
      },
      'metrics-short': {
        policy: {
          phases: {
            hot: { min_age: '0ms', actions: {} },
            delete: { min_age: '7d', actions: { delete: {} } },
          },
          deprecated: true,
        },
        in_use_by: { indices: [], data_streams: [] },
      },
      'unused-policy': {
        policy: {
          phases: {
            hot: { min_age: '0ms', actions: {} },
          },
        },
        in_use_by: { indices: [], data_streams: [] },
      },
    });
    mockEsMethodResolvedValue(esClient.indices.get, {
      '.ds-logs-nginx-000001': { data_stream: 'logs-nginx' },
      'standalone-index': {},
    });

    const result = await tool.handler({}, context);

    const data = getData(result);
    expect(data.ilm_available).toBe(true);
    expect(data.policy_count).toBe(3);

    const logsDefault = data.policies.find((p) => p.name === 'logs-default');
    expect(logsDefault?.managed).toBe(false);
    expect(logsDefault?.deprecated).toBe(false);
    expect(logsDefault?.in_use_by_streams).toEqual(['logs-nginx']);
    expect(logsDefault?.in_use_by_indices).toEqual(['standalone-index']);
    expect(Object.keys(logsDefault!.phases)).toEqual(['hot', 'warm', 'delete']);
    const logsWarm = logsDefault!.phases.warm as Record<string, unknown>;
    expect(logsWarm.min_age).toBe('7d');
    const logsDelete = logsDefault!.phases.delete as Record<string, unknown>;
    expect(logsDelete.min_age).toBe('30d');

    const metricsShort = data.policies.find((p) => p.name === 'metrics-short');
    expect(metricsShort?.deprecated).toBe(true);
    expect(metricsShort?.in_use_by_streams).toEqual([]);
    expect(metricsShort?.in_use_by_indices).toEqual([]);
    const metricsDelete = metricsShort!.phases.delete as Record<string, unknown>;
    expect(metricsDelete.min_age).toBe('7d');

    const unused = data.policies.find((p) => p.name === 'unused-policy');
    expect(Object.keys(unused!.phases)).toEqual(['hot']);
    expect(unused?.managed).toBe(false);
    expect(unused?.in_use_by_streams).toEqual([]);
    expect(unused?.in_use_by_indices).toEqual([]);
  });

  it('returns empty policies array when cluster has no ILM policies', async () => {
    const { tool, context, esClient } = setup();

    mockEsMethodResolvedValue(esClient.ilm.getLifecycle, {});

    const result = await tool.handler({}, context);

    const data = getData(result);
    expect(data.ilm_available).toBe(true);
    expect(data.policy_count).toBe(0);
    expect(data.policies).toEqual([]);
  });

  it('filters out managed policies with dot-prefixed names', async () => {
    const { tool, context, esClient } = setup();

    mockEsMethodResolvedValue(esClient.ilm.getLifecycle, {
      'user-policy': {
        policy: { phases: { hot: { min_age: '0ms', actions: {} } } },
        in_use_by: { indices: [], data_streams: [] },
      },
      '.fleet-file-tohost-meta-ilm-policy': {
        policy: {
          phases: { hot: { min_age: '0ms', actions: {} } },
          _meta: { managed: true },
        },
        in_use_by: { indices: [], data_streams: [] },
      },
      '.internal-ilm-policy': {
        policy: {
          phases: { hot: { min_age: '0ms', actions: {} } },
          _meta: { managed: true },
        },
        in_use_by: { indices: [], data_streams: [] },
      },
      'managed-but-no-dot': {
        policy: {
          phases: { hot: { min_age: '0ms', actions: {} } },
          _meta: { managed: true },
        },
        in_use_by: { indices: [], data_streams: [] },
      },
    });

    const result = await tool.handler({}, context);

    const data = getData(result);
    const names = data.policies.map((p) => p.name);
    expect(names).toContain('user-policy');
    expect(names).toContain('managed-but-no-dot');
    expect(names).not.toContain('.fleet-file-tohost-meta-ilm-policy');
    expect(names).not.toContain('.internal-ilm-policy');
    expect(data.policy_count).toBe(2);

    const managedNoDoT = data.policies.find((p) => p.name === 'managed-but-no-dot');
    expect(managedNoDoT?.managed).toBe(true);
  });

  it('returns error result on API failure', async () => {
    const { tool, context, esClient } = setup();

    esClient.ilm.getLifecycle.mockRejectedValue(new Error('security_exception'));

    const result = await tool.handler({}, context);

    if (!('results' in result)) throw new Error('Expected results');
    expect(result.results[0].data).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('Failed to list ILM policies'),
        operation: 'list_ilm_policies',
      })
    );
  });
});
