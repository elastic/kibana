/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { buildOnlineEvalWorkflowYaml, type OnlineEvalWorkflowConfig } from '../../common';
import { queryKeys } from '../query_keys';
import { useOnlineEvalWorkflows, useUpdateOnlineEvalWorkflow } from './use_online_eval_workflows';

jest.mock('@kbn/kibana-react-plugin/public');

const mockHttp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};

const mockedUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useUpdateOnlineEvalWorkflow', () => {
  let queryClient: QueryClient;

  const config: OnlineEvalWorkflowConfig = {
    name: 'quality monitor',
    indexPattern: 'traces-*',
    extraEsqlWhere: 'service.name == "chat-service"',
    windowMinutes: 60,
    lagMinutes: 15,
    maxTracesPerRun: 25,
    every: '15m',
    evaluators: [{ name: 'correctness', version: '1.0.0' }],
    connectorId: 'connector-1',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockedUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockHttp.get.mockReset();
    mockHttp.post.mockReset();
    mockHttp.put.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('builds yaml and updates workflow config', async () => {
    const workflowId = 'workflow-1';
    const workflowDetail = {
      id: workflowId,
      name: '[online-eval] quality monitor',
      description: 'Online evaluation created by the Evals UI',
      enabled: true,
      tags: ['evals-online'],
      yaml: 'version: "1"',
    };
    const expectedYaml = buildOnlineEvalWorkflowYaml(config);
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    mockHttp.get.mockResolvedValue(workflowDetail);
    mockHttp.put.mockResolvedValue({ id: workflowId });

    const { result } = renderHook(() => useUpdateOnlineEvalWorkflow(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ workflowId, config });
    });

    expect(mockHttp.get).toHaveBeenCalledWith('/api/workflows/workflow/workflow-1', {
      version: '2023-10-31',
    });
    expect(mockHttp.put).toHaveBeenCalledWith('/api/workflows/workflow/workflow-1', {
      body: JSON.stringify({
        name: workflowDetail.name,
        description: workflowDetail.description,
        enabled: workflowDetail.enabled,
        tags: workflowDetail.tags,
        yaml: expectedYaml,
      }),
      version: '2023-10-31',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.onlineEvals.list() });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.onlineEvals.detail(workflowId),
    });
  });

  it('loads missing workflow YAML in one bulk request', async () => {
    const yaml = buildOnlineEvalWorkflowYaml(config);
    mockHttp.get.mockResolvedValue({
      page: 1,
      size: 10,
      total: 2,
      results: [
        { id: 'workflow-1', name: 'First', enabled: true, tags: ['evals-online'] },
        { id: 'workflow-2', name: 'Second', enabled: false, tags: ['evals-online'], yaml },
      ],
    });
    mockHttp.post.mockResolvedValue([{ id: 'workflow-1', yaml }]);

    const { result } = renderHook(() => useOnlineEvalWorkflows(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttp.get).toHaveBeenCalledWith('/api/workflows', {
      query: { tags: 'evals-online' },
      version: '2023-10-31',
    });
    expect(mockHttp.post).toHaveBeenCalledWith('/api/workflows/mget', {
      body: JSON.stringify({ ids: ['workflow-1'], source: ['yaml'] }),
      version: '2023-10-31',
    });
    expect(result.current.data?.workflows).toEqual([
      expect.objectContaining({ id: 'workflow-1', yaml }),
      expect.objectContaining({ id: 'workflow-2', yaml }),
    ]);
  });
});
