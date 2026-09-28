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
    executionOverrides: Parameters<typeof createWorkflowStepExecutionServiceMock>[0] = {},
    { experimental = true }: { experimental?: boolean } = {}
  ) => {
    const conv = createWorkflowStepConversationClientMock();
    const agents = createWorkflowStepAgentRegistryMock();
    const execution = createWorkflowStepExecutionServiceMock({
      maybeExecuteAgent:
        executionOverrides.maybeExecuteAgent ??
        jest.fn().mockResolvedValue({ conversationId, events$: of() }),
    });
    const isExperimentalEnabled = jest.fn().mockResolvedValue(experimental);

    const definition = addUserMessageStepDefinition({
      getConversationClient: conv.getConversationClient,
      getAgentRegistry: agents.getAgentRegistry,
      getExecutionService: execution.getExecutionService,
      isExperimentalEnabled,
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

  it('returns an error without writing when experimental features are disabled', async () => {
    const { execution, definition } = buildDefinition({}, { experimental: false });

    const result = await definition.handler(createStepHandlerContext({ input: baseInput }));

    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringMatching(/experimental features/i),
      }),
    });
    expect(execution.maybeExecuteAgent).not.toHaveBeenCalled();
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
  });
});
