/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import {
  AgentExecutionMode,
  ChatTriggerMode,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import { addUserMessageStepDefinition } from './add_user_message';
import {
  createStepHandlerContext,
  createWorkflowStepAgentRegistryMock,
  createWorkflowStepConversationClientMock,
  createWorkflowStepExecutionServiceMock,
} from '../../test_utils/workflow_steps';

describe('addUserMessageStepDefinition', () => {
  const conversationId = 'conv-1';

  const baseInput = {
    conversation_id: conversationId,
    message: 'Deployment finished',
  };

  const buildDefinition = (
    executionOverrides: Parameters<typeof createWorkflowStepExecutionServiceMock>[0] = {}
  ) => {
    const conv = createWorkflowStepConversationClientMock();
    const agents = createWorkflowStepAgentRegistryMock();
    const execution = createWorkflowStepExecutionServiceMock({
      maybeExecuteAgent:
        executionOverrides.maybeExecuteAgent ??
        jest.fn().mockResolvedValue({ conversationId, events$: of() }),
    });

    const definition = addUserMessageStepDefinition({
      getConversationClient: conv.getConversationClient,
      getAgentRegistry: agents.getAgentRegistry,
      getExecutionService: execution.getExecutionService,
    });

    return { execution, definition };
  };

  it('creates expected step definition structure', () => {
    const { definition } = buildDefinition();

    expect(definition.id).toBe('ai.conversation.add_user_message');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(baseInput).success).toBe(true);
  });

  it('adds the user message without running the agent', async () => {
    const { execution, definition } = buildDefinition();

    const result = await definition.handler(createStepHandlerContext({ input: baseInput }));

    expect(execution.maybeExecuteAgent).toHaveBeenCalledWith({
      mode: AgentExecutionMode.conversation,
      request: expect.any(Object),
      params: {
        conversationId,
        nextInput: { message: 'Deployment finished' },
        triggerMode: ChatTriggerMode.Never,
      },
    });
    expect(result).toEqual({ output: { conversation_id: conversationId } });
  });

  it('passes a trimmed author_name as the author decoration', async () => {
    const { execution, definition } = buildDefinition();

    await definition.handler(
      createStepHandlerContext({
        input: { ...baseInput, author_name: '  Attack Discovery Review  ' },
      })
    );

    expect(execution.maybeExecuteAgent).toHaveBeenCalledWith({
      mode: AgentExecutionMode.conversation,
      request: expect.any(Object),
      params: {
        conversationId,
        nextInput: { message: 'Deployment finished' },
        triggerMode: ChatTriggerMode.Never,
        author: { full_name: 'Attack Discovery Review' },
      },
    });
  });

  it('omits the author when author_name is blank', async () => {
    const { execution, definition } = buildDefinition();

    await definition.handler(
      createStepHandlerContext({ input: { ...baseInput, author_name: '   ' } })
    );

    expect(execution.maybeExecuteAgent.mock.calls[0][0].params).not.toHaveProperty('author');
  });

  it('propagates a not-found error for a missing conversation', async () => {
    const { definition } = buildDefinition({
      maybeExecuteAgent: jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: 'missing' })),
    });

    const result = await definition.handler(
      createStepHandlerContext({ input: { ...baseInput, conversation_id: 'missing' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: expect.stringContaining('missing') }),
    });
  });

  describe('input schema', () => {
    const schema = buildDefinition().definition.inputSchema;

    it('requires conversation_id', () => {
      expect(schema.safeParse({ message: 'hi' }).success).toBe(false);
    });

    it('requires a message', () => {
      expect(schema.safeParse({ conversation_id: conversationId }).success).toBe(false);
    });

    it('rejects a blank message', () => {
      expect(schema.safeParse({ conversation_id: conversationId, message: '  ' }).success).toBe(
        false
      );
    });

    it.each([
      { label: 'absent', authorName: undefined, success: true },
      { label: 'a name', authorName: 'Attack Discovery Review', success: true },
      { label: 'exactly 256 characters', authorName: 'a'.repeat(256), success: true },
      { label: 'empty', authorName: '', success: false },
      { label: 'blank', authorName: '   ', success: false },
      { label: '257 characters', authorName: 'a'.repeat(257), success: false },
    ])('author_name $label -> success $success', ({ authorName, success }) => {
      const input =
        authorName === undefined ? baseInput : { ...baseInput, author_name: authorName };

      expect(schema.safeParse(input).success).toBe(success);
    });
  });
});
