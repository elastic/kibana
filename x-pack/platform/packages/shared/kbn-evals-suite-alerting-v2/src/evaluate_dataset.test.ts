/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import type { TaskOutput } from '@kbn/evals';
import type { ConverseResult, RuleManagementChatClient } from './chat_client';
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

const converseResult = (overrides: Partial<ConverseResult> = {}): ConverseResult => ({
  conversationId: 'conv-1',
  messages: [{ message: 'agent reply' }],
  steps: [],
  errors: [],
  prompts: [],
  ...overrides,
});

/**
 * Chat client stub that returns a scripted response per `converse` call and records the
 * params it was called with, so we can assert how the task loop threads turns and prompts.
 */
const makeChatClient = (
  responses: ConverseResult[],
  listAttachments: jest.Mock = jest.fn(async () => [])
) => {
  const calls: Array<Record<string, unknown>> = [];
  let index = 0;
  const converse = jest.fn(async (params: Record<string, unknown>) => {
    calls.push(params);
    return responses[index++] ?? converseResult();
  });
  return {
    client: { converse, listAttachments } as unknown as RuleManagementChatClient,
    calls,
    listAttachments,
  };
};

const runTask = async (
  client: RuleManagementChatClient,
  input: { turns: string[] }
): Promise<TaskOutput> => {
  const task = createTask(client);
  return task({ input, metadata: null } as Parameters<typeof task>[0]);
};

describe('collectScoredCriteria', () => {
  it('scores both expected and criteria (expected first)', () => {
    expect(
      collectScoredCriteria({
        expected: ['loads skill', 'calls manage_rule'],
        criteria: ['no @timestamp filter'],
      })
    ).toEqual(['loads skill', 'calls manage_rule', 'no @timestamp filter']);
  });

  it('accepts a single expected string', () => {
    expect(collectScoredCriteria({ expected: 'loads skill', criteria: [] })).toEqual([
      'loads skill',
    ]);
  });

  it('scores expected alone when criteria is omitted', () => {
    expect(collectScoredCriteria({ expected: ['loads skill'] })).toEqual(['loads skill']);
  });

  it('scores criteria alone when expected is omitted', () => {
    expect(collectScoredCriteria({ criteria: ['validates query'] })).toEqual(['validates query']);
  });

  it('returns an empty list when neither is provided', () => {
    expect(collectScoredCriteria({})).toEqual([]);
    expect(collectScoredCriteria(undefined)).toEqual([]);
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
    const { client, calls } = makeChatClient([converseResult()]);

    await runTask(client, { turns: ['hello'] });

    expect(calls).toHaveLength(1);
    expect(calls[0].messages).toEqual([{ message: 'hello' }]);
    expect(calls[0].promptResponses).toBeUndefined();
  });

  it('answers a pending opener prompt with the next turn text instead of a new message', async () => {
    const openerPrompt = askUserQuestion('ask-1');
    const { client, calls } = makeChatClient([
      converseResult({ prompts: [openerPrompt] }), // turn 0 -> agent asks
      converseResult({ prompts: [] }), // turn 1 answer -> resolved
    ]);

    await runTask(client, {
      turns: ['I want to set up alerting', 'I mean Alerting V2'],
    });

    expect(calls).toHaveLength(2);
    // Turn 0: plain message, no prompt answers.
    expect(calls[0].messages).toEqual([{ message: 'I want to set up alerting' }]);
    expect(calls[0].promptResponses).toBeUndefined();
    // Turn 1: delivered as the answer to the pending prompt, not as a fresh input message.
    expect(calls[1].promptResponses).toEqual({
      'ask-1': { answers: [{ custom: 'I mean Alerting V2' }] },
    });
  });

  it('captures the opener prompts (turn 0 only) so the judge and low-score logs can see them', async () => {
    const openerPrompt = askUserQuestion('ask-1');
    const laterPrompt = askUserQuestion('ask-2');
    const { client } = makeChatClient([
      converseResult({ prompts: [openerPrompt] }),
      converseResult({ prompts: [laterPrompt] }),
    ]);

    const output = (await runTask(client, {
      turns: ['opener', 'second'],
    })) as TaskOutput & { openerPrompts: unknown[] };

    expect(output.openerPrompts).toEqual([openerPrompt]);
  });

  it('threads the conversationId returned from the first turn into subsequent turns', async () => {
    const { client, calls } = makeChatClient([
      converseResult({ conversationId: 'conv-xyz', prompts: [] }),
      converseResult({ conversationId: 'conv-xyz', prompts: [] }),
    ]);

    await runTask(client, { turns: ['first', 'second'] });

    expect(calls[0].conversationId).toBeUndefined();
    expect(calls[1].conversationId).toBe('conv-xyz');
  });

  it('aggregates steps, errors, and messages across turns', async () => {
    const { client } = makeChatClient([
      converseResult({ steps: [{ a: 1 }], messages: [{ message: 'm0' }], prompts: [] }),
      converseResult({ steps: [{ b: 2 }], messages: [{ message: 'm1' }], prompts: [] }),
    ]);

    const output = (await runTask(client, { turns: ['t0', 't1'] })) as TaskOutput & {
      steps: unknown[];
      messages: unknown[];
    };

    expect(output.steps).toEqual([{ a: 1 }, { b: 2 }]);
    expect(output.messages).toEqual([{ message: 'm0' }, { message: 'm1' }]);
  });

  it('loads conversation attachments and resolves ruleAttachment after converse', async () => {
    const listAttachments = jest.fn(async () => [
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
    ]);
    const { client } = makeChatClient(
      [
        converseResult({
          conversationId: 'conv-xyz',
          messages: [
            { message: 'create a rule' },
            { message: '<render_attachment id="att-1" version="1" />' },
          ],
        }),
      ],
      listAttachments
    );

    const output = (await runTask(client, { turns: ['create a rule'] })) as TaskOutput & {
      conversationId?: string;
      ruleAttachment?: { kind?: string; schedule?: { lookback?: string } };
      attachments?: unknown[];
    };

    expect(listAttachments).toHaveBeenCalledWith('conv-xyz');
    expect(output.conversationId).toBe('conv-xyz');
    expect(output.attachments).toHaveLength(1);
    expect(output.ruleAttachment).toEqual({
      kind: 'alert',
      schedule: { every: '1m', lookback: '5m' },
    });
  });
});
