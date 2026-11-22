/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentBuilderErrorCode,
  ConversationOriginType,
  ConversationRoundStatus,
  isAgentBuilderError,
} from '@kbn/agent-builder-common';
import { AgentPromptType, type PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { ConversationExecutionParams } from '@kbn/agent-builder-server/execution';
import { createEmptyConversation, createRound } from '../../../test_utils/conversations';
import { resolveSurfacePromptInput } from './surface_prompt_input';

const confirmation: PromptRequest = { type: AgentPromptType.confirmation, id: 'c1' };

const origin = { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' };

const pausedConversation = createEmptyConversation({
  rounds: [
    createRound({
      id: 'r1',
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [confirmation],
    }),
  ],
});

const idleConversation = createEmptyConversation({ rounds: [createRound({ id: 'r1' })] });

const createParams = (
  overrides: Partial<ConversationExecutionParams> = {}
): ConversationExecutionParams => ({ origin, nextInput: {}, ...overrides });

const errorCode = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return isAgentBuilderError(error) ? error.code : undefined;
  }
};

describe('resolveSurfacePromptInput', () => {
  it('turns the chosen options into the prompt responses, and does not keep them', () => {
    expect(
      resolveSurfacePromptInput({
        params: createParams({ promptSelections: ['{"p":"c1","a":true}'] }),
        conversation: pausedConversation,
      })
    ).toEqual({ origin, nextInput: { prompts: { c1: { allow: true } } } });
  });

  it('reads a reply to a paused conversation as the answer, not as a new message', () => {
    expect(
      resolveSurfacePromptInput({
        params: createParams({ nextInput: { message: 'no' } }),
        conversation: pausedConversation,
      }).nextInput
    ).toEqual({ message: undefined, prompts: { c1: { allow: false } } });
  });

  it('refuses a reply that does not answer the pending prompt', () => {
    expect(
      errorCode(() =>
        resolveSurfacePromptInput({
          params: createParams({ nextInput: { message: 'What does it delete?' } }),
          conversation: pausedConversation,
        })
      )
    ).toBe(AgentBuilderErrorCode.conversationPaused);
  });

  it('refuses options chosen for a conversation that is no longer paused', () => {
    expect(
      errorCode(() =>
        resolveSurfacePromptInput({
          params: createParams({ promptSelections: ['{"p":"c1","a":true}'] }),
          conversation: idleConversation,
        })
      )
    ).toBe(AgentBuilderErrorCode.badRequest);
  });

  it('leaves a message to a conversation that is not paused as it is', () => {
    const params = createParams({ nextInput: { message: 'yes' } });

    expect(resolveSurfacePromptInput({ params, conversation: idleConversation })).toEqual(params);
  });

  it('resolves chosen options without an origin, but does not read a reply as an answer', () => {
    expect(
      resolveSurfacePromptInput({
        params: createParams({ origin: undefined, promptSelections: ['{"p":"c1","a":true}'] }),
        conversation: pausedConversation,
      }).nextInput
    ).toEqual({ message: undefined, prompts: { c1: { allow: true } } });
  });

  it('leaves requests without an origin, or with their own prompt responses, as they are', () => {
    const withoutOrigin = createParams({ origin: undefined, nextInput: { message: 'yes' } });
    const withPrompts = createParams({ nextInput: { prompts: { c1: { allow: false } } } });

    expect(
      resolveSurfacePromptInput({ params: withoutOrigin, conversation: pausedConversation })
    ).toEqual(withoutOrigin);
    expect(
      resolveSurfacePromptInput({ params: withPrompts, conversation: pausedConversation })
    ).toEqual(withPrompts);
  });
});
