/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPipelineEditorAgent } from './pipeline_editor_agent';

jest.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: jest.fn(() => ({
    withConfig: jest.fn().mockReturnThis(),
  })),
}));

describe('createPipelineEditorAgent', () => {
  const mockModel = {} as any;
  const mockTools = [{ name: 'validate_ingest_pipeline' }, { name: 'fetch_log_samples' }] as any;

  it('should create an agent with the given model and tools', () => {
    const { createReactAgent } = jest.requireMock('@langchain/langgraph/prebuilt');

    createPipelineEditorAgent({ model: mockModel, tools: mockTools });

    expect(createReactAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'pipeline_editor_agent',
        llm: mockModel,
        tools: mockTools,
      })
    );
  });

  it('should return an agent with config applied', () => {
    const result = createPipelineEditorAgent({ model: mockModel, tools: mockTools });
    expect(result).toBeDefined();
  });
});
