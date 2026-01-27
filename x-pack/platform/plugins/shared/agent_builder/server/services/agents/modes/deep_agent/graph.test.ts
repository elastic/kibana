/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { createDeepAgent } from '@kbn/langchain-deep-agent';

jest.mock('@kbn/langchain-deep-agent', () => ({
  createDeepAgent: jest.fn(),
}));

// The deep agent graph depends on middlewares that import `langchain` (not `@langchain/*`).
// In this repo test environment, importing `langchain` can fail due to upstream dependency wiring.
// We don't need the real middleware behavior for this unit test, so we mock them out.
jest.mock('./middlewares/researchAgentMiddleware', () => ({
  createResearchMiddleware: jest.fn(() => ({ name: 'mockResearchMiddleware' })),
}));

jest.mock('./middlewares/skillMiddleware', () => ({
  createSkillSystemPromptMiddleware: jest.fn(() => ({ name: 'mockSkillSystemPromptMiddleware' })),
  createSkillToolExecutor: jest.fn(() => ({ name: 'mockInvokeSkillTool' })),
}));

import { createAgentGraph } from './graph';

const createDeepAgentMock = createDeepAgent as unknown as jest.Mock;

describe('deep agent graph', () => {
  it('forces answerAgent to disable tool calling (prevents simulated tool calls like invoke_skill)', async () => {
    const answeringModel = {
      invoke: jest.fn().mockResolvedValue(new AIMessage({ content: 'final answer', id: 'a1' })),
    };

    const chatModel = {
      withConfig: jest.fn().mockReturnValue(answeringModel),
    } as any;

    createDeepAgentMock.mockReturnValue({
      invoke: jest.fn().mockResolvedValue({
        messages: [new AIMessage({ content: 'Ready to answer', id: 'r1' })],
      }),
    });

    const graph = createAgentGraph({
      chatModel,
      tools: [],
      skillFiles: {},
      skillTools: [],
      configuration: {
        research: { instructions: '', replace_default_instructions: false },
        answer: { instructions: '', replace_default_instructions: false },
      },
      capabilities: { visualizations: false },
      logger: { debug: jest.fn() } as any,
      events: { emit: jest.fn() } as any,
      skillToolContext: {} as any,
    });

    await graph.invoke({
      messages: [new HumanMessage({ content: 'hello', id: 'u1' })],
    });

    expect(answeringModel.invoke).toHaveBeenCalled();
    const [, options] = answeringModel.invoke.mock.calls[0];
    expect(options).toEqual(
      expect.objectContaining({
        functionCallingMode: 'native',
      })
    );
  });
});


