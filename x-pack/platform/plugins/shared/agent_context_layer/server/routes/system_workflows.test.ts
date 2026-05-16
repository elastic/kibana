/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { registerSystemWorkflowsRoutes } from './system_workflows';
import type {
  AgentContextLayerPluginStart,
  AgentContextLayerStartDependencies,
  WorkflowsManagementApiContract,
} from '../types';

interface CapturedRoute {
  handler: (...args: any[]) => Promise<any>;
}

const createMockApi = () =>
  ({
    isWorkflowsAvailable: true,
    getWorkflow: jest.fn(),
    getWorkflows: jest.fn(),
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    deleteWorkflows: jest.fn().mockResolvedValue({ total: 0, deleted: 0, failures: [] }),
    runWorkflow: jest.fn(),
    cancelWorkflowExecution: jest.fn(),
    resumeWorkflowExecution: jest.fn(),
    getWorkflowExecutions: jest.fn(),
    getWorkflowExecution: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<WorkflowsManagementApiContract>);

const buildSystemWorkflowDetail = (overrides: { id?: string; tags?: string[] } = {}) => ({
  id: overrides.id ?? 'workflow-sml-index-augmentation',
  name: 'Index augmentation',
  enabled: true,
  definition: {
    name: 'index_augmentation',
    triggers: [],
    steps: [],
    version: '1',
    tags: overrides.tags ?? ['sml-system', 'sml'],
  } as any,
  yaml: '',
});

describe('Agent Context Layer — system workflows routes', () => {
  let routes: Record<string, CapturedRoute>;
  let mockApi: jest.Mocked<WorkflowsManagementApiContract>;

  beforeEach(() => {
    routes = {};
    mockApi = createMockApi();
    const captureRoute = (method: string) => (config: { path: string }, handler: any) => {
      routes[`${method}:${config.path}`] = { handler };
    };
    const router = {
      get: jest.fn().mockImplementation(captureRoute('GET')),
      post: jest.fn().mockImplementation(captureRoute('POST')),
    } as any;

    const coreSetup = coreMock.createSetup();
    const spacesStart = spacesMock.createStart();
    spacesStart.spacesService.getSpaceId = jest.fn().mockReturnValue('default');
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([
      coreMock.createStart(),
      { spaces: spacesStart } as Partial<AgentContextLayerStartDependencies>,
      {} as AgentContextLayerPluginStart,
    ]);

    registerSystemWorkflowsRoutes({
      router,
      coreSetup: coreSetup as unknown as CoreSetup<
        AgentContextLayerStartDependencies,
        AgentContextLayerPluginStart
      >,
      logger: loggingSystemMock.createLogger(),
      getWorkflowsManagementApi: () => mockApi,
    });
  });

  it("list route filters by the 'sml-system' tag", async () => {
    mockApi.getWorkflows.mockResolvedValue({ page: 1, size: 50, total: 0, results: [] });
    const request = httpServerMock.createKibanaRequest({
      query: { page: 1, size: 50 },
    });
    const response = httpServerMock.createResponseFactory();

    await routes['GET:/internal/agent_context_layer/system_workflows'].handler(
      {},
      request,
      response
    );

    expect(mockApi.getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['sml-system'], page: 1, size: 50 }),
      'default',
      { includeExecutionHistory: true }
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('list route overrides history with the truly latest execution and enriches progress', async () => {
    // Upstream `getWorkflows` returns history sorted by `finishedAt desc`,
    // so a brand-new running execution lands behind older completed ones.
    // We mock that explicitly so the test fails if the route ever blindly
    // trusts `history[0]` again.
    mockApi.getWorkflows.mockResolvedValue({
      page: 1,
      size: 50,
      total: 2,
      results: [
        {
          id: 'workflow-sml-index-crawl',
          name: 'Crawl',
          description: '',
          enabled: true,
          definition: null,
          createdAt: '2026-05-12T09:00:00.000Z',
          valid: true,
          history: [
            {
              id: 'exec-crawl-old',
              status: 'completed',
              startedAt: '2026-05-12T09:00:00.000Z',
              finishedAt: '2026-05-12T09:05:00.000Z',
              duration: 300_000,
            },
          ],
        },
        {
          id: 'workflow-sml-index-augmentation',
          name: 'Augment',
          description: '',
          enabled: true,
          definition: null,
          createdAt: '2026-05-12T09:00:00.000Z',
          valid: true,
          history: [
            {
              id: 'exec-aug-old',
              status: 'completed',
              startedAt: '2026-05-12T09:00:00.000Z',
              finishedAt: '2026-05-12T09:05:00.000Z',
              duration: 300_000,
            },
          ],
        },
      ],
    } as any);
    (mockApi.getWorkflowExecutions as jest.Mock).mockImplementation(async ({ workflowId }) => {
      if (workflowId === 'workflow-sml-index-crawl') {
        return {
          page: 1,
          size: 1,
          total: 2,
          results: [
            {
              id: 'exec-crawl-new',
              workflowId,
              workflowName: 'Crawl',
              status: 'running',
              startedAt: '2026-05-12T10:00:00.000Z',
              finishedAt: '',
              duration: null,
            },
          ],
        };
      }
      return {
        page: 1,
        size: 1,
        total: 1,
        results: [
          {
            id: 'exec-aug-old',
            workflowId,
            workflowName: 'Augment',
            status: 'completed',
            startedAt: '2026-05-12T09:00:00.000Z',
            finishedAt: '2026-05-12T09:05:00.000Z',
            duration: 300_000,
          },
        ],
      };
    });
    mockApi.getWorkflowExecution.mockResolvedValue({
      id: 'exec-crawl-new',
      workflowId: 'workflow-sml-index-crawl',
      status: 'running',
      stepExecutions: [
        {
          id: 'list-step',
          stepId: 'list_indices',
          status: 'completed',
          startedAt: '2026-05-12T10:00:01.000Z',
          output: [{ index: 'a' }, { index: 'b' }, { index: 'c' }],
        },
        {
          id: 'run-1',
          stepId: 'run_augmentation',
          stepType: 'workflow.execute',
          status: 'completed',
          startedAt: '2026-05-12T10:00:02.000Z',
          input: { inputs: { indexPattern: 'a' } },
        },
        {
          id: 'run-2',
          stepId: 'run_augmentation',
          stepType: 'workflow.execute',
          status: 'waiting',
          startedAt: '2026-05-12T10:00:30.000Z',
          input: { inputs: { indexPattern: 'b' } },
        },
      ],
      context: {},
    } as any);

    const request = httpServerMock.createKibanaRequest({ query: { page: 1, size: 50 } });
    const response = httpServerMock.createResponseFactory();

    await routes['GET:/internal/agent_context_layer/system_workflows'].handler(
      {},
      request,
      response
    );

    // The freshest run is the one we re-fetch — not the stale `history[0]`.
    // The route MUST request both input and output — without them the
    // workflows API strips `list_indices.output` and the `workflow.execute`
    // step `input`, which would blank out total/currentIndex.
    expect(mockApi.getWorkflowExecution).toHaveBeenCalledTimes(1);
    expect(mockApi.getWorkflowExecution).toHaveBeenCalledWith('exec-crawl-new', 'default', {
      includeInput: true,
      includeOutput: true,
    });

    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.results[0]).toMatchObject({
      id: 'workflow-sml-index-crawl',
      // history is overwritten with the newer running execution so the
      // "Last run" column reflects reality.
      history: [
        expect.objectContaining({ id: 'exec-crawl-new', status: 'running' }),
      ],
      progress: {
        kind: 'crawl',
        total: 3,
        completed: 1,
        currentIndex: 'b',
      },
    });
    expect(body.results[1].progress).toBeUndefined();
    expect(body.results[1].history[0]).toMatchObject({ id: 'exec-aug-old', status: 'completed' });
  });

  it('list route silently degrades when progress enrichment fails', async () => {
    mockApi.getWorkflows.mockResolvedValue({
      page: 1,
      size: 50,
      total: 1,
      results: [
        {
          id: 'workflow-sml-index-augmentation',
          name: 'Aug',
          enabled: true,
          history: [],
        } as any,
      ],
    } as any);
    (mockApi.getWorkflowExecutions as jest.Mock).mockResolvedValue({
      page: 1,
      size: 1,
      total: 1,
      results: [
        {
          id: 'exec-fail',
          workflowId: 'workflow-sml-index-augmentation',
          workflowName: 'Aug',
          status: 'running',
          startedAt: '2026-05-12T10:00:00.000Z',
          finishedAt: '',
          duration: null,
        },
      ],
    });
    mockApi.getWorkflowExecution.mockRejectedValue(new Error('timeout'));

    const request = httpServerMock.createKibanaRequest({ query: { page: 1, size: 50 } });
    const response = httpServerMock.createResponseFactory();

    await routes['GET:/internal/agent_context_layer/system_workflows'].handler(
      {},
      request,
      response
    );

    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.results[0].progress).toBeUndefined();
    // History fallback still surfaces the running run even when the
    // step-level fetch fails — the UI needs *something* to render.
    expect(body.results[0].history[0]).toMatchObject({
      id: 'exec-fail',
      status: 'running',
    });
    expect(response.ok).toHaveBeenCalled();
  });

  it("start route rejects workflows that are not tagged 'sml-system'", async () => {
    mockApi.getWorkflow.mockResolvedValue(
      buildSystemWorkflowDetail({ id: 'workflow-other', tags: ['other'] }) as any
    );
    const request = httpServerMock.createKibanaRequest({
      params: { id: 'workflow-other' },
      body: { inputs: {} },
    });
    const response = httpServerMock.createResponseFactory();

    await routes['POST:/internal/agent_context_layer/system_workflows/{id}/_start'].handler(
      {},
      request,
      response
    );

    expect(mockApi.runWorkflow).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it("start route invokes runWorkflow when the workflow is tagged 'sml-system'", async () => {
    mockApi.getWorkflow.mockResolvedValue(buildSystemWorkflowDetail() as any);
    mockApi.runWorkflow.mockResolvedValue('exec-123');

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'workflow-sml-index-augmentation' },
      body: { inputs: {} },
    });
    const response = httpServerMock.createResponseFactory();

    await routes['POST:/internal/agent_context_layer/system_workflows/{id}/_start'].handler(
      {},
      request,
      response
    );

    expect(mockApi.runWorkflow).toHaveBeenCalled();
    const [, , , , triggeredBy] = mockApi.runWorkflow.mock.calls[0];
    expect(triggeredBy).toBe('agent_context_layer:management_page');
    expect(response.ok).toHaveBeenCalledWith({ body: { executionId: 'exec-123' } });
  });

  it("cancel route refuses workflows that are not tagged 'sml-system'", async () => {
    mockApi.getWorkflow.mockResolvedValue(
      buildSystemWorkflowDetail({ id: 'evil', tags: [] }) as any
    );
    const request = httpServerMock.createKibanaRequest({
      params: { id: 'evil', executionId: 'exec-1' },
    });
    const response = httpServerMock.createResponseFactory();

    await routes[
      'POST:/internal/agent_context_layer/system_workflows/{id}/executions/{executionId}/_cancel'
    ].handler({}, request, response);

    expect(mockApi.cancelWorkflowExecution).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('install route delegates to installSystemWorkflows and returns the result', async () => {
    mockApi.getWorkflow.mockResolvedValue(null);
    (mockApi as any).createWorkflow.mockResolvedValue({ id: 'workflow-sml-x' } as any);

    const request = httpServerMock.createKibanaRequest({});
    const response = httpServerMock.createResponseFactory();

    await routes['POST:/internal/agent_context_layer/system_workflows/_install'].handler(
      {},
      request,
      response
    );

    expect((mockApi as any).createWorkflow).toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        created: expect.any(Array),
        skipped: expect.any(Array),
        failed: expect.any(Array),
      }),
    });
  });
});
