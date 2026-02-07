/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import { createAgentGraph } from './graph';

describe('createAgentGraph', () => {
  it('binds tools for the answer agent and forces tool_choice "none"', () => {
    const tools = [{ name: 'tool-1' }] as any[];

    const chatModel = {
      bindTools: jest.fn().mockImplementation(() => chatModel),
      withConfig: jest.fn().mockImplementation(() => chatModel),
    } as unknown as InferenceChatModel;

    const toolManager = {
      list: jest.fn().mockReturnValue(tools),
    } as unknown as ToolManager;

    createAgentGraph({
      chatModel,
      toolManager,
      // Remaining deps are only used at runtime (during graph execution)
      // so minimal stubs are sufficient for this construction-time test.
      logger: {} as any,
      events: { emit: jest.fn() } as any,
      configuration: {} as any,
      capabilities: {} as any,
      processedConversation: {} as any,
      promptFactory: {} as any,
    });

    expect((chatModel as any).bindTools).toHaveBeenCalledWith(tools, { tool_choice: 'none' });
  });
});

