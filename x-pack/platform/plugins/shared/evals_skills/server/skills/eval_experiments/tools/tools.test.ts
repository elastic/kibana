/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { EVALS_EXPERIMENT_WORKFLOW_TAG } from '@kbn/evals-plugin/common';
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
  getWorkflow: jest.Mock;
  cancelWorkflowExecution: jest.Mock;
}

const createDeps = (
  overrides: Partial<EvalExperimentsToolDeps> = {}
): {
  deps: EvalExperimentsToolDeps;
  workflowsApi: WorkflowsApiMock;
  logger: ReturnType<typeof loggingSystemMock.createLogger>;
} => {
  const workflowsApi: WorkflowsApiMock = {
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    executeWorkflow: jest.fn(),
    getWorkflow: jest.fn(),
    cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  };
  const logger = loggingSystemMock.createLogger();
  const deps: EvalExperimentsToolDeps = {
    workflowsApi: workflowsApi as unknown as EvalExperimentsToolDeps['workflowsApi'],
    serverBasePath: '',
    logger,
    getStartDependencies: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
  return { deps, workflowsApi, logger };
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

const grantingDeps = () => ({
  getStartDependencies: jest
    .fn()
    .mockResolvedValue(
      securityWith(true)
    ) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
});

const validConfig = {
  target: 'agent' as const,
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

  it('generates a direct-inference experiment with no agent in the workflow', async () => {
    const { deps } = createDeps();
    const result = firstResult(
      await previewEvalExperimentTool(deps).handler(
        { ...validConfig, target: 'inference', agent_id: undefined },
        createContext()
      )
    );

    expect(result.type).toBe(ToolResultType.other);
    expect(result.data.workflow_yaml).toContain('steps:');
    expect(result.data.workflow_yaml).not.toContain('agent_id');
  });

  it('returns an error result for an invalid configuration', async () => {
    const { deps } = createDeps();
    const result = firstResult(
      await previewEvalExperimentTool(deps).handler(
        { ...validConfig, agent_id: undefined },
        createContext()
      )
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/Provide an agent_id/);
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
    workflowsApi.getWorkflow.mockResolvedValue({
      definition: { tags: ['evals', EVALS_EXPERIMENT_WORKFLOW_TAG] },
    });
    workflowsApi.updateWorkflow.mockResolvedValue({});

    const result = firstResult(
      await saveEvalExperimentTool(deps).handler(
        { ...validConfig, workflow_id: 'wf-1' },
        createContext()
      )
    );

    expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('wf-1', 'default');
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

  it('refuses to overwrite a workflow that is not an evals-owned experiment', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.getWorkflow.mockResolvedValue({
      definition: { tags: ['some-other-feature'] },
    });

    const result = firstResult(
      await saveEvalExperimentTool(deps).handler(
        { ...validConfig, workflow_id: 'wf-foreign' },
        createContext()
      )
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(workflowsApi.updateWorkflow).not.toHaveBeenCalled();
    expect(workflowsApi.createWorkflow).not.toHaveBeenCalled();
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

  it('saves when security is enabled and the caller has manage_evals', async () => {
    const { deps, workflowsApi } = createDeps(grantingDeps());
    workflowsApi.createWorkflow.mockResolvedValue({ id: 'wf-new', name: 'Evaluate agent agent-1' });

    const result = firstResult(
      await saveEvalExperimentTool(deps).handler(validConfig, createContext())
    );

    expect(workflowsApi.createWorkflow).toHaveBeenCalledTimes(1);
    expect(result.type).toBe(ToolResultType.other);
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

  it('cancels already-launched executions when a later launch in the fan-out fails', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.executeWorkflow
      .mockResolvedValueOnce({ workflowExecutionId: 'we-1' })
      .mockRejectedValueOnce(new Error('workflow engine boom'));

    const result = firstResult(
      await runEvalExperimentTool(deps).handler(
        { ...validConfig, connector_ids: ['c1', 'c2'] },
        createContext()
      )
    );

    expect(result.type).toBe(ToolResultType.error);
    // The caller gets no ids back, so the one that launched must not be left running.
    expect(workflowsApi.cancelWorkflowExecution).toHaveBeenCalledTimes(1);
    expect(workflowsApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      'we-1',
      'default',
      expect.anything()
    );
  });

  it('logs the orphan when the rollback itself fails', async () => {
    const { deps, workflowsApi, logger } = createDeps();
    workflowsApi.executeWorkflow
      .mockResolvedValueOnce({ workflowExecutionId: 'we-1' })
      .mockRejectedValueOnce(new Error('workflow engine boom'));
    workflowsApi.cancelWorkflowExecution.mockRejectedValue(new Error('cancel failed'));

    const result = firstResult(
      await runEvalExperimentTool(deps).handler(
        { ...validConfig, connector_ids: ['c1', 'c2'] },
        createContext()
      )
    );

    expect(result.type).toBe(ToolResultType.error);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cancel orphaned experiment workflow execution we-1')
    );
  });

  it('does not attempt cancellation when the first launch fails', async () => {
    const { deps, workflowsApi } = createDeps();
    workflowsApi.executeWorkflow.mockRejectedValueOnce(new Error('workflow engine boom'));

    await runEvalExperimentTool(deps).handler(validConfig, createContext());

    expect(workflowsApi.cancelWorkflowExecution).not.toHaveBeenCalled();
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

  it('launches when security is enabled and the caller has manage_evals', async () => {
    const { deps, workflowsApi } = createDeps(grantingDeps());
    workflowsApi.executeWorkflow.mockResolvedValue({ workflowExecutionId: 'we-1' });

    const result = firstResult(
      await runEvalExperimentTool(deps).handler(validConfig, createContext())
    );

    expect(workflowsApi.executeWorkflow).toHaveBeenCalledTimes(1);
    expect(result.type).toBe(ToolResultType.other);
  });
});

describe('discovery tools', () => {
  const emptyFacets = { tags: [], maturity: [] };

  it('lists datasets via the evals dataset service', async () => {
    const list = jest.fn().mockResolvedValue({
      datasets: [{ id: 'd1', name: 'D1', description: 'x', examples_count: 2 }],
      total: 1,
      facets: emptyFacets,
    });
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: { datasetService: { getClient: () => ({ list }) } },
        agentBuilder: {},
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvalDatasetsTool(deps).handler({}, createContext()));

    expect(list).toHaveBeenCalledWith({
      search: undefined,
      tags: undefined,
      maturity: undefined,
      page: 1,
      perPage: 50,
    });
    expect(result.type).toBe(ToolResultType.other);
    expect(result.data.total).toBe(1);
    expect(result.data.datasets[0].id).toBe('d1');
  });

  it('narrows datasets by tag and maturity and reports the available tags', async () => {
    const list = jest.fn().mockResolvedValue({
      datasets: [
        {
          id: 'd1',
          name: 'D1',
          description: 'x',
          tags: ['golden', 'esql'],
          maturity: 'golden',
          examples_count: 2,
        },
      ],
      total: 1,
      facets: { tags: [{ value: 'golden', count: 3 }], maturity: [{ value: 'golden', count: 3 }] },
    });
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: { datasetService: { getClient: () => ({ list }) } },
        agentBuilder: {},
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(
      await listEvalDatasetsTool(deps).handler(
        { tags: ['golden'], maturity: ['golden'] },
        createContext()
      )
    );

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['golden'], maturity: ['golden'] })
    );
    expect(result.data.datasets[0]).toMatchObject({
      tags: ['golden', 'esql'],
      maturity: 'golden',
    });
    expect(result.data.available_tags).toEqual(['golden']);
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

  it('refuses to list datasets when the caller lacks read_evals', async () => {
    const list = jest.fn();
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        ...securityWith(false),
        evals: { datasetService: { getClient: () => ({ list }) } },
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvalDatasetsTool(deps).handler({}, createContext()));

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/read_evals/);
    expect(list).not.toHaveBeenCalled();
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

  it('refuses to list evaluators when the caller lacks read_evals', async () => {
    const listEvaluators = jest.fn();
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        ...securityWith(false),
        evals: { listEvaluators },
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvaluatorsTool(deps).handler({}, createContext()));

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/read_evals/);
    expect(listEvaluators).not.toHaveBeenCalled();
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

  it('refuses to list model connectors when the caller lacks read_evals', async () => {
    const listModelConnectors = jest.fn();
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        ...securityWith(false),
        evals: { listModelConnectors },
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listConnectorsTool(deps).handler({}, createContext()));

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/read_evals/);
    expect(listModelConnectors).not.toHaveBeenCalled();
  });

  it('lists agent targets from the agent builder registry', async () => {
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        evals: {},
        agentBuilder: {
          agents: {
            getRegistry: async () => ({
              list: async () => [{ id: 'a1', name: 'A', description: 'da' }],
            }),
          },
        },
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvalTargetsTool(deps).handler({}, createContext()));

    expect(result.data.agents[0].id).toBe('a1');
  });

  it('refuses to list agent targets when the caller lacks read_evals', async () => {
    const getRegistry = jest.fn();
    const { deps } = createDeps({
      getStartDependencies: jest.fn().mockResolvedValue({
        ...securityWith(false),
        agentBuilder: { agents: { getRegistry } },
      }) as unknown as EvalExperimentsToolDeps['getStartDependencies'],
    });

    const result = firstResult(await listEvalTargetsTool(deps).handler({}, createContext()));

    expect(result.type).toBe(ToolResultType.error);
    expect(result.data.message).toMatch(/read_evals/);
    expect(getRegistry).not.toHaveBeenCalled();
  });
});
