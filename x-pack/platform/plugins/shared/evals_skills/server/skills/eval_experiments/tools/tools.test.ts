/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { EvalExperimentsToolDeps } from './deps';
import { listEvalDatasetsTool } from './list_eval_datasets';
import { listEvaluatorsTool } from './list_evaluators';
import { listEvalTargetsTool } from './list_eval_targets';
import { listConnectorsTool } from './list_eval_connectors';
import { previewEvalExperimentTool } from './preview_eval_experiment';
import { saveEvalExperimentTool } from './save_eval_experiment';
import { runEvalExperimentTool } from './run_eval_experiment';

const createContext = (spaceId = 'default'): ToolHandlerContext =>
  ({ request: httpServerMock.createKibanaRequest(), spaceId } as unknown as ToolHandlerContext);

const firstResult = (ret: unknown) =>
  (ret as { results: Array<{ type: string; data: any }> }).results[0];

interface WorkflowsApiMock {
  createWorkflow: jest.Mock;
  updateWorkflow: jest.Mock;
  executeWorkflow: jest.Mock;
}

const createDeps = (
  overrides: Partial<EvalExperimentsToolDeps> = {}
): { deps: EvalExperimentsToolDeps; workflowsApi: WorkflowsApiMock } => {
  const workflowsApi: WorkflowsApiMock = {
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
  };
  const deps: EvalExperimentsToolDeps = {
    workflowsApi: workflowsApi as unknown as EvalExperimentsToolDeps['workflowsApi'],
    serverBasePath: '',
    getStartDependencies: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
  return { deps, workflowsApi };
};

const securityWith = (hasAllRequested: boolean) =>
  ({
    security: {
      authz: {
        actions: { api: { get: (privilege: string) => `api:${privilege}` } },
        checkPrivilegesWithRequest: () => ({
          atSpace: async () => ({ hasAllRequested }),
        }),
      },
    },
  } as unknown as Awaited<ReturnType<EvalExperimentsToolDeps['getStartDependencies']>>);

const denyingDeps = () => ({
  getStartDependencies: jest
    .fn()
    .mockResolvedValue(
      securityWith(false)
    ) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
});

const validConfig = {
  connector_ids: ['c1'],
  dataset_ids: ['d1'],
  evaluators: [{ name: 'correctness', connector_id: 'judge-1' }],
  agent_id: 'agent-1',
};

describe('previewEvalExperimentTool', () => {
  it('returns the generated workflow yaml and run plan', async () => {
    const { deps } = createDeps();
    const result = firstResult(
      await previewEvalExperimentTool(deps).handler(validConfig, createContext())
    );

    expect(result.type).toBe(ToolResultType.other);
    expect(typeof result.data.workflow_yaml).toBe('string');
    expect(result.data.workflow_yaml).toContain('steps:');
    expect(result.data.run_plan.mode).toBe('single');
    expect(result.data.run_plan.execution_count).toBe(1);
  });

  it('returns an error result for an invalid configuration', async () => {
    const { deps } = createDeps();
    const result = firstResult(
      await previewEvalExperimentTool(deps).handler(
        { ...validConfig, tool_id: 't' },
        createContext()
      )
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/only one of agent_id or tool_id/);
  });
});

describe('saveEvalExperimentTool', () => {
  it('creates a new workflow when no workflow_id is provided', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.createWorkflow.mockResolvedValue({ id: 'wf-new', name: 'Evaluate agent agent-1' });

    const result = firstResult(
      await saveEvalExperimentTool(deps).handler(validConfig, createContext())
    );

    expect(workflowsApi.createWorkflow).toHaveBeenCalledTimes(1);
    expect(workflowsApi.updateWorkflow).not.toHaveBeenCalled();
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data.workflow_id).toBe('wf-new');
    expect(result.data.updated).toBe(false);
    expect(result.data.workflow_url).toBe('/app/workflows/wf-new');
  });

  it('updates an existing workflow in place when workflow_id is provided', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.updateWorkflow.mockResolvedValue({});

    const result = firstResult(
      await saveEvalExperimentTool(deps).handler(
        { ...validConfig, workflow_id: 'wf-1' },
        createContext()
      )
    );

    expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({ yaml: expect.any(String) }),
      'default',
      expect.anything()
    );
    expect(workflowsApi.createWorkflow).not.toHaveBeenCalled();
    expect(result.data.workflow_id).toBe('wf-1');
    expect(result.data.updated).toBe(true);
  });

  it('returns an error result when saving fails', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.createWorkflow.mockRejectedValue(new Error('boom'));

    const result = firstResult(
      await saveEvalExperimentTool(deps).handler(validConfig, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toContain('Failed to save experiment workflow');
  });

  it('returns an error result and does not save when the caller lacks manage_evals', async () => {
    const { deps, workflowsApi } = createDeps(denyingDeps());

    const result = firstResult(
      await saveEvalExperimentTool(deps).handler(validConfig, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/manage_evals/);
    expect(workflowsApi.createWorkflow).not.toHaveBeenCalled();
    expect(workflowsApi.updateWorkflow).not.toHaveBeenCalled();
  });
});

describe('runEvalExperimentTool', () => {
  it('launches a single execution and links to the experiment detail page', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.executeWorkflow.mockResolvedValue({ workflowExecutionId: 'we-1' });

    const result = firstResult(
      await runEvalExperimentTool(deps).handler(validConfig, createContext())
    );

    expect(workflowsApi.executeWorkflow).toHaveBeenCalledTimes(1);
    expect(workflowsApi.executeWorkflow.mock.calls[0][0]).toMatchObject({
      waitForCompletion: false,
      spaceId: 'default',
      triggeredBy: 'evals-skill-run',
    });
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data.workflow_execution_ids).toEqual(['we-1']);
    expect(result.data.results_url).toContain('/app/management/ai/evals/experiments/');
  });

  it('fans out one execution per model for cross-model runs', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.executeWorkflow
      .mockResolvedValueOnce({ workflowExecutionId: 'we-1' })
      .mockResolvedValueOnce({ workflowExecutionId: 'we-2' });

    const result = firstResult(
      await runEvalExperimentTool(deps).handler(
        { ...validConfig, connector_ids: ['c1', 'c2'] },
        createContext()
      )
    );

    expect(workflowsApi.executeWorkflow).toHaveBeenCalledTimes(2);
    expect(result.data.mode).toBe('cross-model');
    expect(result.data.workflow_execution_ids).toEqual(['we-1', 'we-2']);
    expect(result.data.results_url).toContain('/app/management/ai/evals/runs');
  });

  it('associates the run with a saved workflow id when provided', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.executeWorkflow.mockResolvedValue({ workflowExecutionId: 'we-1' });

    await runEvalExperimentTool(deps).handler(
      { ...validConfig, workflow_id: 'wf-1' },
      createContext()
    );

    expect(workflowsApi.executeWorkflow.mock.calls[0][0]).toMatchObject({ workflowId: 'wf-1' });
  });

  it('returns an error result and does not launch when the caller lacks manage_evals', async () => {
    const { deps, workflowsApi } = createDeps(denyingDeps());

    const result = firstResult(
      await runEvalExperimentTool(deps).handler(validConfig, createContext())
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/manage_evals/);
    expect(workflowsApi.executeWorkflow).not.toHaveBeenCalled();
  });
});

describe('discovery tools', () => {
  it('lists datasets via the evals dataset service', async () => {
    const list = jest.fn().mockResolvedValue({
      datasets: [{ id: 'd1', name: 'D1', description: 'x', examples_count: 2 }],
      total: 1,
    });
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: { datasetService: { getClient: () => ({ list }) } },
        agentBuilder: {},
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvalDatasetsTool(deps).handler({}, createContext()));

    expect(list).toHaveBeenCalledWith({ search: undefined, page: 1, perPage: 50 });
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data.total).toBe(1);
    expect(result.data.datasets[0].id).toBe('d1');
  });

  it('returns an error result when the dataset service is unavailable', async () => {
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: {},
        agentBuilder: {},
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvalDatasetsTool(deps).handler({}, createContext()));

    expect(result.type).toBe(ToolResultType.error);
  });

  it('lists evaluators via the evals start contract', async () => {
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: {
          listEvaluators: () => [
            {
              name: 'correctness',
              version: '1',
              kind: 'llm',
              description: 'd',
              needsJudgeConnector: true,
              supportsBareToolTrace: true,
            },
          ],
        },
        agentBuilder: {},
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvaluatorsTool(deps).handler({}, createContext()));

    expect(result.data.evaluators).toHaveLength(1);
    expect(result.data.evaluators[0].needsJudgeConnector).toBe(true);
  });

  it('lists model connectors via the evals start contract', async () => {
    const listModelConnectors = jest
      .fn()
      .mockResolvedValue([{ id: '.gen-ai-1', name: 'GPT', type: 'openai' }]);
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: { listModelConnectors },
        agentBuilder: {},
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listConnectorsTool(deps).handler({}, createContext()));

    expect(listModelConnectors).toHaveBeenCalledTimes(1);
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data.total).toBe(1);
    expect(result.data.connectors[0].id).toBe('.gen-ai-1');
  });

  it('returns an error result when connector listing is unavailable', async () => {
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: {},
        agentBuilder: {},
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listConnectorsTool(deps).handler({}, createContext()));

    expect(result.type).toBe(ToolResultType.error);
  });

  it('lists agent and tool targets from the agent builder registries', async () => {
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: {},
        agentBuilder: {
          agents: {
            getRegistry: async () => ({
              list: async () => [{ id: 'a1', name: 'A', description: 'da' }],
            }),
          },
          tools: {
            getRegistry: async () => ({
              list: async () => [{ id: 't1', type: 'builtin', description: 'dt' }],
            }),
          },
        },
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvalTargetsTool(deps).handler({}, createContext()));

    expect(result.data.agents[0].id).toBe('a1');
    expect(result.data.tools[0].id).toBe('t1');
  });
});
