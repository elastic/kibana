/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';
import type { AgentBuilderClient, AgentBuilderClientResponse, TaskOutput } from '@kbn/evals';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { buildPromptResponses, collectScoredCriteria, createTask } from './evaluate_dataset';

const askUserQuestion = (id: string, questionCount = 1): PromptRequest =>
  ({
    type: AgentPromptType.ask_user_question,
    id,
    questions: Array.from({ length: questionCount }, (_, i) => ({
      question: `Q${i}`,
      options: [{ label: 'Alerting V2' }, { label: 'Security detection rules' }],
      multi_select: false,
    })),
  } as PromptRequest);

const confirmation = (id: string): PromptRequest =>
  ({ type: AgentPromptType.confirmation, id } as PromptRequest);

const authorization = (id: string): PromptRequest =>
  ({ type: AgentPromptType.authorization, id } as PromptRequest);

const converseResult = (
  overrides: Partial<AgentBuilderClientResponse> = {}
): AgentBuilderClientResponse => ({
  conversationId: 'conv-1',
  message: 'agent reply',
  steps: [],
  prompts: [],
  ...overrides,
});

const round = (userMessage: string, assistantMessage: string): ConversationRound =>
  ({
    input: { message: userMessage },
    response: { message: assistantMessage },
  } as ConversationRound);

const conversationResult = (overrides: Partial<Conversation> = {}): Conversation =>
  ({
    id: 'conv-1',
    rounds: [round('hello', 'agent reply')],
    attachments: [],
    ...overrides,
  } as Conversation);

/**
 * Client stub that returns a scripted response per `converse` call and records the
 * params it was called with, so we can assert how the task loop threads turns and prompts.
 */
const makeClient = ({
  responses,
  conversation = conversationResult(),
  getConversation = jest.fn(async () => conversation),
}: {
  responses: AgentBuilderClientResponse[];
  conversation?: Conversation;
  getConversation?: jest.Mock;
}) => {
  const calls: Array<Record<string, unknown>> = [];
  let index = 0;
  const converse = jest.fn(async (params: Record<string, unknown>) => {
    calls.push(params);
    return responses[index++] ?? converseResult();
  });
  return {
    client: { converse, getConversation } as unknown as AgentBuilderClient,
    calls,
    getConversation,
  };
};

const runTask = async (
  client: AgentBuilderClient,
  input: { turns: string[] }
): Promise<TaskOutput> => {
  const task = createTask(client, agentBuilderDefaultAgentId);
  return task({ input, metadata: null } as Parameters<typeof task>[0]);
};

describe('collectScoredCriteria', () => {
  it('returns non-empty criteria', () => {
    expect(
      collectScoredCriteria({
        criteria: ['loads skill', 'calls manage_rule', 'no @timestamp filter'],
      })
    ).toEqual(['loads skill', 'calls manage_rule', 'no @timestamp filter']);
  });

  it('filters blank criteria strings', () => {
    expect(collectScoredCriteria({ criteria: ['loads skill', '  ', ''] })).toEqual(['loads skill']);
  });

  it('returns null when criteria is omitted so the evaluator can skip', () => {
    expect(collectScoredCriteria({})).toBeNull();
    expect(collectScoredCriteria(undefined)).toBeNull();
    expect(collectScoredCriteria({ criteria: undefined })).toBeNull();
    expect(collectScoredCriteria({ criteria: null as unknown as string[] })).toBeNull();
  });

  it('throws when criteria is present but empty or only blanks', () => {
    expect(() => collectScoredCriteria({ criteria: [] })).toThrow(
      /criteria must contain at least one/i
    );
    expect(() => collectScoredCriteria({ criteria: ['', '  '] })).toThrow(
      /criteria must contain at least one/i
    );
  });

  it('throws when criteria is present but not an array', () => {
    expect(() => collectScoredCriteria({ criteria: 'loads skill' as unknown as string[] })).toThrow(
      /criteria must be an array/i
    );
  });
});

describe('buildPromptResponses', () => {
  it('answers an ask_user_question with the turn text as free-text (custom)', () => {
    const result = buildPromptResponses([askUserQuestion('ask-1')], 'I mean Alerting V2');
    expect(result).toEqual({ 'ask-1': { answers: [{ custom: 'I mean Alerting V2' }] } });
  });

  it('provides one custom answer per question in a multi-question prompt', () => {
    const result = buildPromptResponses([askUserQuestion('ask-1', 3)], 'answer');
    expect(result['ask-1']).toEqual({
      answers: [{ custom: 'answer' }, { custom: 'answer' }, { custom: 'answer' }],
    });
  });

  it('answers a confirmation prompt by allowing it', () => {
    expect(buildPromptResponses([confirmation('c-1')], 'x')).toEqual({ 'c-1': { allow: true } });
  });

  it('answers an authorization prompt by authorizing it', () => {
    expect(buildPromptResponses([authorization('a-1')], 'x')).toEqual({
      'a-1': { authorized: true },
    });
  });

  it('answers multiple pending prompts in one map', () => {
    const result = buildPromptResponses([askUserQuestion('ask-1'), confirmation('c-1')], 'go');
    expect(result).toEqual({
      'ask-1': { answers: [{ custom: 'go' }] },
      'c-1': { allow: true },
    });
  });

  it('returns an empty map when there are no prompts', () => {
    expect(buildPromptResponses([], 'x')).toEqual({});
  });
});

describe('createTask', () => {
  it('sends a single-turn example as an input message with no prompt responses', async () => {
    const { client, calls } = makeClient({ responses: [converseResult()] });

    await runTask(client, { turns: ['hello'] });

    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe('hello');
    expect(calls[0].promptResponses).toBeUndefined();
  });

  it('answers a pending opener prompt with the next turn text instead of a new message', async () => {
    const pendingPrompt = askUserQuestion('ask-1');
    const { client, calls } = makeClient({
      responses: [
        converseResult({ prompts: [pendingPrompt] }), // turn 0 -> agent asks
        converseResult({ prompts: [] }), // turn 1 answer -> resolved
      ],
    });

    await runTask(client, {
      turns: ['I want to set up alerting', 'I mean Alerting V2'],
    });

    expect(calls).toHaveLength(2);
    // Turn 0: plain message, no prompt answers.
    expect(calls[0].input).toBe('I want to set up alerting');
    expect(calls[0].promptResponses).toBeUndefined();
    // Turn 1: delivered as the answer to the pending prompt, not as a fresh input message.
    expect(calls[1].promptResponses).toEqual({
      'ask-1': { answers: [{ custom: 'I mean Alerting V2' }] },
    });
  });

  it('captures prompts from every turn so the judge and low-score logs can see them', async () => {
    const firstPrompt = askUserQuestion('ask-1');
    const laterPrompt = askUserQuestion('ask-2');
    const { client } = makeClient({
      responses: [
        converseResult({ prompts: [firstPrompt] }),
        converseResult({ prompts: [laterPrompt] }),
      ],
    });

    const output = (await runTask(client, {
      turns: ['opener', 'second'],
    })) as TaskOutput & { prompts: unknown[] };

    expect(output.prompts).toEqual([firstPrompt, laterPrompt]);
  });

  it('threads the conversationId returned from the first turn into subsequent turns', async () => {
    const { client, calls } = makeClient({
      responses: [
        converseResult({ conversationId: 'conv-xyz', prompts: [] }),
        converseResult({ conversationId: 'conv-xyz', prompts: [] }),
      ],
      conversation: conversationResult({ id: 'conv-xyz' }),
    });

    await runTask(client, { turns: ['first', 'second'] });

    expect(calls[0].conversationId).toBeUndefined();
    expect(calls[1].conversationId).toBe('conv-xyz');
  });

  it('aggregates steps and loads rounds/messages from GET conversation', async () => {
    const rounds = [round('t0', 'm0'), round('t1', 'm1')];
    const { client, getConversation } = makeClient({
      responses: [
        converseResult({ steps: [{ a: 1 }], prompts: [] }),
        converseResult({ steps: [{ b: 2 }], prompts: [] }),
      ],
      conversation: conversationResult({ rounds }),
    });

    const output = (await runTask(client, { turns: ['t0', 't1'] })) as TaskOutput & {
      steps: unknown[];
      messages: unknown[];
      rounds: unknown[];
    };

    expect(getConversation).toHaveBeenCalledWith('conv-1');
    expect(output.steps).toEqual([{ a: 1 }, { b: 2 }]);
    expect(output.rounds).toEqual(rounds);
    expect(output.messages).toEqual([
      { role: 'user', message: 't0' },
      { role: 'assistant', message: 'm0' },
      { role: 'user', message: 't1' },
      { role: 'assistant', message: 'm1' },
    ]);
  });

  it('loads attachments from GET conversation after converse', async () => {
    const attachments = [
      {
        id: 'att-1',
        type: 'rule',
        current_version: 1,
        versions: [
          {
            version: 1,
            data: { kind: 'alert', schedule: { every: '1m', lookback: '5m' } },
            created_at: '2026-01-01T00:00:00.000Z',
            content_hash: 'h1',
          },
        ],
      },
    ];
    const { client, getConversation } = makeClient({
      responses: [converseResult({ conversationId: 'conv-xyz' })],
      conversation: conversationResult({
        id: 'conv-xyz',
        rounds: [round('create a rule', '<render_attachment id="att-1" version="1" />')],
        attachments: attachments as Conversation['attachments'],
      }),
    });

    const output = (await runTask(client, { turns: ['create a rule'] })) as TaskOutput & {
      conversationId?: string;
      attachments?: unknown[];
    };

    expect(getConversation).toHaveBeenCalledWith('conv-xyz');
    expect(output.conversationId).toBe('conv-xyz');
    expect(output.attachments).toEqual([
      expect.objectContaining({
        id: 'att-1',
        type: 'rule',
      }),
    ]);
  });

  it('throws when GET conversation fails after retries', async () => {
    const getConversation = jest.fn(async () => {
      throw new Error('conversation gone');
    });
    const { client } = makeClient({
      responses: [converseResult({ conversationId: 'conv-xyz' })],
      getConversation,
    });

    await expect(runTask(client, { turns: ['create a rule'] })).rejects.toThrow(
      'conversation gone'
    );
    expect(getConversation).toHaveBeenCalledWith('conv-xyz');
  });

  it('throws when converse returns no conversationId', async () => {
    const { client, getConversation } = makeClient({
      responses: [converseResult({ conversationId: undefined })],
    });

    await expect(runTask(client, { turns: ['create a rule'] })).rejects.toThrow(
      /No conversationId after converse/
    );
    expect(getConversation).not.toHaveBeenCalled();
  });
});
