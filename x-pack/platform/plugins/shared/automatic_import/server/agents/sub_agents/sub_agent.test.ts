/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { GenAISemanticConventions, withActiveInferenceSpan } from '@kbn/inference-tracing';
import { createTaskTool } from './sub_agent';

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
