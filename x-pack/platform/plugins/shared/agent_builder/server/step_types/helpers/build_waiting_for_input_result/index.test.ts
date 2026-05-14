/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { buildWaitingForInputResult } from '.';

describe('buildWaitingForInputResult', () => {
  const formPrompt = {
    type: AgentPromptType.form,
    id: 'prompt-1',
    execution_id: 'inner-exec-id',
    step_execution_id: 'step-exec-id',
    message: 'Please fill out the form',
    schema: { type: 'object', properties: { name: { type: 'string' } } },
  };

  it('returns null when round status is not awaitingPrompt', () => {
    const round = {
      id: 'r-1',
      status: ConversationRoundStatus.completed,
      pending_prompts: [formPrompt],
      steps: [],
      response: { message: 'done' },
    } as any;

    const result = buildWaitingForInputResult({ outputConversationId: 'c-1', round });

    expect(result).toBeNull();
  });

  it('returns waitingForInput without agent_context when no reasoning or tool-call steps', () => {
    const round = {
      id: 'r-1',
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [formPrompt],
      steps: [],
      response: { message: '' },
    } as any;

    const result = buildWaitingForInputResult({ outputConversationId: 'c-1', round });

    expect(result).not.toBeNull();
    expect(result?.waitingForInput?.agent_context).toBeUndefined();
  });

  it('returns waitingForInput with message and schema from form prompt', () => {
    const round = {
      id: 'r-1',
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [formPrompt],
      steps: [],
      response: { message: '' },
    } as any;

    const result = buildWaitingForInputResult({ outputConversationId: 'c-1', round });

    expect(result?.waitingForInput?.message).toBe('Please fill out the form');
    expect(result?.waitingForInput?.schema).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
  });

  it('returns waitingForInput with stepState capturing conversationId and innerExecutionId', () => {
    const round = {
      id: 'r-1',
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [formPrompt],
      steps: [],
      response: { message: '' },
    } as any;

    const result = buildWaitingForInputResult({ outputConversationId: 'c-42', round });

    expect(result?.waitingForInput?.stepState).toEqual({
      conversationId: 'c-42',
      innerExecutionId: 'inner-exec-id',
    });
  });

  it('returns waitingForInput even when no form prompt is found in pending_prompts', () => {
    const round = {
      id: 'r-1',
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [],
      steps: [],
      response: { message: '' },
    } as any;

    const result = buildWaitingForInputResult({ outputConversationId: undefined, round });

    expect(result).not.toBeNull();
    expect(result?.waitingForInput).toBeDefined();
    expect(result?.waitingForInput?.message).toBeUndefined();
  });

  it('never attaches agent_context, even when reasoning and tool-call steps are present', () => {
    const round = {
      id: 'r-1',
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [formPrompt],
      steps: [
        {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'I should use the HITL tool to get approval',
          tool_call_id: 'tc-1',
        },
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tc-1',
          tool_id: 'andrew.testing.agent.hitl.test',
          params: { message: 'Need approval' },
          results: [],
        },
      ],
      response: { message: '' },
    } as any;

    const result = buildWaitingForInputResult({ outputConversationId: 'c-1', round });

    expect(result?.waitingForInput?.agent_context).toBeUndefined();
  });

  it('emits a [hitl-debug][ab] build.waitingForInput debug marker with formPromptFound, schemaPresent, messagePresent', () => {
    const logger = { debug: jest.fn() };
    const round = {
      id: 'r-1',
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [formPrompt],
      steps: [],
      response: { message: '' },
    } as any;

    buildWaitingForInputResult({ logger, outputConversationId: 'c-1', round });

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('[hitl-debug][ab] build.waitingForInput')
    );
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('formPromptFound=true'));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('schemaPresent=true'));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('messagePresent=true'));
  });
});
