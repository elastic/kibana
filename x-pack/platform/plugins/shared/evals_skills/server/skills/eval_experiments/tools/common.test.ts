/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GeneratedExperimentRun } from '@kbn/evals-plugin/server';
import {
  EvalExperimentConfigError,
  buildResultsLink,
  buildWorkflowLink,
  toGenerateParams,
} from './common';

const baseConfig = {
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
    expect(params.toolId).toBeUndefined();
  });

  it('maps tool targets to toolId', () => {
    const params = toGenerateParams({ ...baseConfig, tool_id: 'tool-1' });
    expect(params.toolId).toBe('tool-1');
    expect(params.agentId).toBeUndefined();
  });

  it('rejects providing both agent_id and tool_id', () => {
    expect(() => toGenerateParams({ ...baseConfig, agent_id: 'a', tool_id: 't' })).toThrow(
      EvalExperimentConfigError
    );
  });

  it('rejects providing neither agent_id nor tool_id', () => {
    expect(() => toGenerateParams({ ...baseConfig })).toThrow(/either an agent_id or a tool_id/);
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

  it('links single runs to the experiment detail page', () => {
    const link = buildResultsLink('', 'default', singleRun, ['w1']);
    const url = new URL(`http://host${link}`);
    expect(url.pathname).toBe('/app/management/ai/evals/experiments/x1');
    expect(url.searchParams.get('execution_id')).toBe('e1');
    expect(url.searchParams.get('workflow_execution_id')).toBe('w1');
  });

  it('links cross-model runs to the run overview and honors base path + space', () => {
    const link = buildResultsLink('/base', 'team-a', crossModelRun, ['w1', 'w2']);
    const url = new URL(`http://host${link}`);
    expect(url.pathname).toBe('/base/s/team-a/app/management/ai/evals/runs');
    expect(url.searchParams.get('execution_id')).toBe('launch::c1,launch::c2');
    expect(url.searchParams.get('connector')).toBe('c1,c2');
    expect(url.searchParams.get('workflow_execution_id')).toBe('w1,w2');
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
