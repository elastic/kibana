/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { AskUserQuestionPrompt } from '@kbn/agent-builder-common/agents';
import type { ConversationsService } from '../../../services/conversations';
import { queryKeys } from '../../query_keys';
import { createNewRound } from '../../utils/new_conversation';
import { createConversationActions } from './use_conversation_actions';

const conversationId = 'conv-1';
const queryKey = queryKeys.conversations.byId(conversationId);

const buildActions = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const get = jest.fn().mockResolvedValue({ id: conversationId, rounds: [] });
  const conversationsService = { get } as unknown as ConversationsService;
  const actions = createConversationActions({
    conversationId,
    queryClient,
    conversationsService,
  });
  return { queryClient, actions, get };
};

const cachedConversation = {
  id: conversationId,
  agent_id: 'agent-1',
  rounds: [],
} as unknown as Conversation;
const conversationWithRound = (round = createNewRound({ userMessage: 'hello' })) =>
  ({ ...cachedConversation, rounds: [round] } as Conversation);

const promptId = 'prompt-1';
const questions = [
  { question: 'Choose one:', options: [{ label: 'A' }, { label: 'B' }], multi_select: false },
];
const answers = [{ choice: [0] }];
const askUserQuestionResponse = { answers };

const pendingPrompt: AskUserQuestionPrompt = {
  type: AgentPromptType.ask_user_question,
  id: promptId,
  questions,
};

const awaitingPromptRound = () => ({
  ...createNewRound({ userMessage: 'hello' }),
  status: ConversationRoundStatus.awaitingPrompt,
  pending_prompts: [pendingPrompt],
});

describe('createConversationActions execution lifecycle', () => {
  it('onExecutionStarted refreshes the list only', () => {
    const { queryClient, actions, get } = buildActions();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    actions.onExecutionStarted();

    expect(get).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.conversations.list });
  });

  it('onExecutionTerminated refreshes the list only', () => {
    const { queryClient, actions, get } = buildActions();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    actions.onExecutionTerminated();

    expect(get).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.conversations.list });
  });

  it('refetchConversation cancels an older in-flight fetch and returns a fresh response', async () => {
    const { queryClient, actions, get } = buildActions();
    queryClient.setQueryData<Conversation>(queryKey, cachedConversation);
    let finishOlder: (value: unknown) => void = () => {};
    get
      .mockImplementationOnce(() => new Promise((resolve) => (finishOlder = resolve)))
      .mockResolvedValue({ id: conversationId, rounds: [], title: 'fresh' });
    const older = queryClient
      .fetchQuery({ queryKey, queryFn: () => get({ conversationId }) })
      .catch(() => 'cancelled');

    const fresh = actions.refetchConversation();
    finishOlder({ id: conversationId, rounds: [], title: 'stale' });

    await expect(older).resolves.toBe('cancelled');
    await expect(fresh).resolves.toMatchObject({ title: 'fresh' });
    expect(get).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData<Conversation>(queryKey)?.title).toBe('fresh');
  });

  it('refetchConversation rejects on failure and leaves the cached conversation untouched', async () => {
    const { queryClient, actions, get } = buildActions();
    queryClient.setQueryData<Conversation>(queryKey, { ...cachedConversation, title: 'kept' });
    get.mockRejectedValue(new Error('boom'));

    await expect(actions.refetchConversation()).rejects.toThrow('boom');
    expect(queryClient.getQueryData<Conversation>(queryKey)?.title).toBe('kept');
  });
});
