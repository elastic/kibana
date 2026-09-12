/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedExperimentRun } from '@kbn/evals-plugin/server';
import {
  EvalExperimentConfigError,
  assertDatasetsVisible,
  buildResultsLink,
  buildWorkflowLink,
  evalExperimentConfigSchema,
  toGenerateParams,
} from './common';

const baseConfig = {
  target: 'agent' as const,
  connector_ids: ['c1'],
  dataset_ids: ['d1'],
  evaluators: [{ name: 'correctness', connector_id: 'judge-1' }],
};

describe('toGenerateParams', () => {
  it('maps the snake_case config to camelCase generator params', () => {
    const params = toGenerateParams({
      ...baseConfig,
      agent_id: 'agent-1',
      name: 'My experiment',
      repetitions: 2,
      concurrency: 3,
    });

    expect(params).toMatchObject({
      name: 'My experiment',
      connectorIds: ['c1'],
      agentId: 'agent-1',
      datasetIds: ['d1'],
      evaluators: [{ name: 'correctness', connector_id: 'judge-1' }],
      repetitions: 2,
      concurrency: 3,
    });
  });

  it('omits agentId for a direct-inference target', () => {
    const params = toGenerateParams({ ...baseConfig, target: 'inference' });

    expect(params.agentId).toBeUndefined();
    expect(params.connectorIds).toEqual(['c1']);
  });

  it('ignores a stray agent_id when the target is inference', () => {
    const params = toGenerateParams({
      ...baseConfig,
      target: 'inference',
      agent_id: 'agent-1',
    });

    expect(params.agentId).toBeUndefined();
  });

  it('rejects an agent target without an agent_id', () => {
    expect(() => toGenerateParams({ ...baseConfig })).toThrow(EvalExperimentConfigError);
    expect(() => toGenerateParams({ ...baseConfig })).toThrow(/Provide an agent_id/);
  });
});

describe('evalExperimentConfigSchema', () => {
  it('requires an explicit target', () => {
    const result = evalExperimentConfigSchema.safeParse({
      connector_ids: ['c1'],
      dataset_ids: ['d1'],
      evaluators: [{ name: 'correctness', connector_id: 'judge-1' }],
    });

    expect(result.success).toBe(false);
  });

  it('accepts an inference target with no agent_id', () => {
    const result = evalExperimentConfigSchema.safeParse({
      ...baseConfig,
      target: 'inference',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an agent target with no agent_id', () => {
    const result = evalExperimentConfigSchema.safeParse(baseConfig);

    expect(result.success).toBe(false);
  });

  it('rejects an inference target that also passes an agent_id', () => {
    const result = evalExperimentConfigSchema.safeParse({
      ...baseConfig,
      target: 'inference',
      agent_id: 'agent-1',
    });

    expect(result.success).toBe(false);
  });
});

describe('buildResultsLink', () => {
  const singleRun: GeneratedExperimentRun = {
    executionId: 'e1',
    executions: [
      { yaml: '', connectorId: 'c1', datasetIds: ['d1'], executionId: 'e1', experimentId: 'x1' },
    ],
    experimentIds: ['x1'],
    mode: 'single',
    compareBy: 'experiment',
  };

  const crossModelRun: GeneratedExperimentRun = {
    executionId: 'launch',
    executions: [
      { yaml: '', connectorId: 'c1', datasetIds: ['d1'], executionId: 'launch::c1' },
      { yaml: '', connectorId: 'c2', datasetIds: ['d1'], executionId: 'launch::c2' },
    ],
    experimentIds: [],
    mode: 'cross-model',
    compareBy: 'execution',
  };

  const datasetFanoutRun: GeneratedExperimentRun = {
    executionId: 'e1',
    executions: [
      { yaml: '', connectorId: 'c1', datasetIds: ['d1'], executionId: 'e1', experimentId: 'x1' },
      { yaml: '', connectorId: 'c1', datasetIds: ['d2'], executionId: 'e1', experimentId: 'x1' },
    ],
    experimentIds: ['x1'],
    mode: 'dataset-fanout',
    compareBy: 'experiment',
  };

  it('links single runs to the experiment detail page', () => {
    const link = buildResultsLink('', 'default', singleRun, ['w1']);
    const url = new URL(`http://host${link}`);
    expect(url.pathname).toBe('/app/evals/experiments/x1');
    expect(url.searchParams.get('execution_id')).toBe('e1');
    expect(url.searchParams.getAll('workflow_execution_id')).toEqual(['w1']);
  });

  it('links cross-model runs to the run overview and honors base path + space', () => {
    const link = buildResultsLink('/base', 'team-a', crossModelRun, ['w1', 'w2']);
    const url = new URL(`http://host${link}`);
    expect(url.pathname).toBe('/base/s/team-a/app/evals/runs');
    expect(url.searchParams.getAll('execution_id')).toEqual(['launch::c1', 'launch::c2']);
    expect(url.searchParams.getAll('connector')).toEqual(['c1', 'c2']);
    expect(url.searchParams.getAll('workflow_execution_id')).toEqual(['w1', 'w2']);
  });

  it('keeps ids intact when a connector id contains a comma', () => {
    const commaRun: GeneratedExperimentRun = {
      ...crossModelRun,
      executions: [
        { yaml: '', connectorId: 'a,b', datasetIds: ['d1'], executionId: 'launch::a,b' },
        { yaml: '', connectorId: 'c2', datasetIds: ['d1'], executionId: 'launch::c2' },
      ],
    };

    const url = new URL(`http://host${buildResultsLink('', 'default', commaRun, ['w1', 'w2'])}`);

    expect(url.searchParams.getAll('connector')).toEqual(['a,b', 'c2']);
    expect(url.searchParams.getAll('execution_id')).toEqual(['launch::a,b', 'launch::c2']);
  });

  it('links dataset-fanout runs to the experiment detail page, not the run overview', () => {
    const link = buildResultsLink('', 'default', datasetFanoutRun, ['w1', 'w2']);
    const url = new URL(`http://host${link}`);
    expect(url.pathname).toBe('/app/evals/experiments/x1');
    expect(url.searchParams.get('execution_id')).toBe('e1');
    expect(url.searchParams.getAll('workflow_execution_id')).toEqual(['w1', 'w2']);
  });
});

describe('buildWorkflowLink', () => {
  it('builds a default-space link', () => {
    expect(buildWorkflowLink('', 'default', 'wf1')).toBe('/app/workflows/wf1');
  });

  it('includes base path, space segment, and encodes the id', () => {
    expect(buildWorkflowLink('/base', 'team-a', 'wf 1')).toBe(
      '/base/s/team-a/app/workflows/wf%201'
    );
  });
});

describe('assertDatasetsVisible', () => {
  const createDatasetService = (visibleBySpace: Record<string, string[]>) => {
    const getClient = jest.fn(({ spaceId }: { spaceId: string }) => ({
      datasetExists: async (datasetId: string) =>
        (visibleBySpace[spaceId] ?? []).includes(datasetId),
    }));

    return {
      datasetService: { getClient } as unknown as Parameters<
        typeof assertDatasetsVisible
      >[0]['datasetService'],
      getClient,
    };
  };

  it('passes the datasets the space can see', async () => {
    const { datasetService, getClient } = createDatasetService({ marketing: ['d1', 'd2'] });

    await expect(
      assertDatasetsVisible({ datasetService, spaceId: 'marketing', datasetIds: ['d1', 'd2'] })
    ).resolves.toBeUndefined();

    expect(getClient).toHaveBeenCalledWith({ spaceId: 'marketing' });
  });

  it('names every dataset the space cannot see', async () => {
    const { datasetService } = createDatasetService({ marketing: ['d1'], sales: ['d2', 'd3'] });

    const rejection = assertDatasetsVisible({
      datasetService,
      spaceId: 'marketing',
      datasetIds: ['d1', 'd2', 'd3'],
    });

    // The ids exist, just not here: the message has to say so, or the answer
    // reads as the datasets having been deleted.
    await expect(rejection).rejects.toBeInstanceOf(EvalExperimentConfigError);
    await expect(rejection).rejects.toThrow(/not found in this space: d2, d3/);
  });
});
