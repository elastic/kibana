/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { GenAISemanticConventions, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { AutomaticImportAgentStateType } from '../state';
import { buildSubAgentContext, createTaskTool } from './sub_agent';

jest.mock('@kbn/inference-tracing', () => ({
  ...jest.requireActual('@kbn/inference-tracing'),
  withActiveInferenceSpan: jest.fn((_name: string, _options: unknown, callback: () => unknown) =>
    callback()
  ),
}));

const invokeSubAgent = jest.fn(async () => ({ messages: [{ content: 'done' }] }));

jest.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: () => ({ invoke: invokeSubAgent }),
}));

describe('createTaskTool', () => {
  it('runs each sub-agent in a span named after it', async () => {
    const taskTool = createTaskTool({
      subagents: [
        { name: 'ingest_pipeline_generator', description: 'Builds the pipeline', prompt: '' },
      ],
      model: {} as InferenceChatModel,
    });

    await taskTool.invoke({
      type: 'tool_call',
      id: 'call-1',
      name: 'task',
      args: { description: 'Build the pipeline', subagent_name: 'ingest_pipeline_generator' },
    });

    expect(invokeSubAgent).toHaveBeenCalledTimes(1);
    expect(withActiveInferenceSpan).toHaveBeenCalledWith(
      'invoke_agent ingest_pipeline_generator',
      expect.objectContaining({
        attributes: expect.objectContaining({
          [GenAISemanticConventions.GenAIAgentName]: 'ingest_pipeline_generator',
        }),
      }),
      expect.any(Function)
    );
  });
});

const baseState: AutomaticImportAgentStateType = {
  messages: [],
  current_pipeline: {},
  pipeline_generation_results: [],
  failure_count: 0,
  pipeline_validation_results: {
    success_rate: 100,
    successful_samples: 0,
    failed_samples: 0,
    total_samples: 0,
    failure_details: [],
  },
  analysis: 'analysis',
  review: '',
  field_mappings: [],
};

const samples = ['{"a":1}', '{"a":2}'];

const userContext = {
  integrationDescription: 'Acme firewall',
  dataStreamDescription: 'Traffic logs',
};

const SUB_AGENT_NAMES = ['log_and_ecs_analyzer', 'ingest_pipeline_generator', 'review_agent'];

describe('buildSubAgentContext', () => {
  it.each(SUB_AGENT_NAMES)('adds the user context right after the task for %s', (agentName) => {
    const context = buildSubAgentContext(agentName, 'Do the task', baseState, samples, userContext);

    expect(context).toContain(
      '</task>\n\n<user_provided_context>\nBackground information written by the user'
    );
    expect(context).toContain('<integration_description>Acme firewall</integration_description>');
    expect(context).toContain('<data_stream_description>Traffic logs</data_stream_description>');
  });

  it.each(SUB_AGENT_NAMES)('leaves out the user context for %s when there is none', (agentName) => {
    const context = buildSubAgentContext(agentName, 'Do the task', baseState, samples);

    expect(context).toContain('<task>\nDo the task\n</task>');
    expect(context).not.toContain('<user_provided_context>');
  });

  it('adds the user context to the generator on review iterations', () => {
    const context = buildSubAgentContext(
      'ingest_pipeline_generator',
      'Fix the review issues',
      { ...baseState, review: 'review feedback' },
      samples,
      userContext
    );

    expect(context).toContain('<user_provided_context>');
    expect(context).toContain('<review_feedback>');
  });

  it('wraps the analyzer task when there is user context but no samples', () => {
    const context = buildSubAgentContext(
      'log_and_ecs_analyzer',
      'Analyze',
      baseState,
      [],
      userContext
    );

    expect(context.startsWith('<task>\nAnalyze\n</task>\n\n<user_provided_context>')).toBe(true);
    expect(context).not.toContain('<log_samples');
  });

  it('returns the analyzer task unchanged when there are no samples and no user context', () => {
    expect(buildSubAgentContext('log_and_ecs_analyzer', 'Analyze', baseState, [])).toBe('Analyze');
  });

  it('returns the task unchanged for an unknown sub-agent', () => {
    expect(
      buildSubAgentContext('unknown_agent', 'Do the task', baseState, samples, userContext)
    ).toBe('Do the task');
  });
});
