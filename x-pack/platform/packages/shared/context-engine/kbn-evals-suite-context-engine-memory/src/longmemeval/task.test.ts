/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { POC_INDEX } from './constants';
import type { LongMemEvalExample, LongMemEvalHistory } from './dataset';
import { deletePocIndex, loadHistoryIntoPocIndex } from './index_store';
import { buildAgentPrompt, createLongMemEvalTask } from './task';

jest.mock('./index_store');

const mockedLoad = jest.mocked(loadHistoryIntoPocIndex);
const mockedDelete = jest.mocked(deletePocIndex);

const history: LongMemEvalHistory = { sessions: [] };
const example = {
  id: 'q1',
  input: { question: 'What colour is my bike?', questionDate: '2023/05/30 (Tue) 20:36' },
} as unknown as LongMemEvalExample;

const esClient = {} as Client;
const log = { info: jest.fn() } as unknown as ToolingLog;

interface ConverseResult {
  message: string;
  prompts: unknown[];
  steps: unknown[];
  traceId?: string;
}

const buildTask = (converse: jest.Mock) =>
  createLongMemEvalTask({
    agentBuilderClient: { converse },
    agentId: 'agent',
    esClient,
    histories: new Map([['q1', history]]),
    log,
  });

const answered = (overrides: Partial<ConverseResult> = {}): ConverseResult => ({
  message: 'Red',
  prompts: [],
  steps: [],
  traceId: 'trace-1',
  ...overrides,
});

describe('buildAgentPrompt', () => {
  it('contains only the date, the question and the index name', () => {
    const prompt = buildAgentPrompt(example.input);

    expect(prompt).toContain(`Current Date: ${example.input.questionDate}`);
    expect(prompt).toContain(`Question: ${example.input.question}`);
    expect(prompt).toContain(POC_INDEX);
    expect(prompt).not.toMatch(/session-\d{4}|answer_|has_answer/);
  });
});

describe('createLongMemEvalTask', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedLoad.mockResolvedValue({ durationMs: 5, documentCount: 0 });
    mockedDelete.mockResolvedValue(undefined);
  });

  it('returns the answer and always deletes the index afterwards', async () => {
    const converse = jest.fn().mockResolvedValue(answered());

    const output = await buildTask(converse)(example);

    expect(output).toMatchObject({ taskStatus: 'ok', finalResponse: 'Red', traceId: 'trace-1' });
    expect(mockedDelete).toHaveBeenCalledTimes(1);
  });

  it('turns an index load failure into a typed error, skips the agent and cleans up', async () => {
    mockedLoad.mockRejectedValue(new Error('bulk failed'));
    const converse = jest.fn();

    const output = await buildTask(converse)(example);

    expect(output).toMatchObject({
      taskStatus: 'error',
      errorCode: 'index_load_failed',
      finalResponse: null,
    });
    expect(converse).not.toHaveBeenCalled();
    expect(mockedDelete).toHaveBeenCalledTimes(1);
  });

  it('turns agent failures into a typed error and still cleans up', async () => {
    const converse = jest.fn().mockRejectedValue(new Error('connector down'));

    const output = await buildTask(converse)(example);

    expect(output).toMatchObject({ taskStatus: 'error', errorCode: 'agent_call_failed' });
    expect(mockedDelete).toHaveBeenCalledTimes(1);
  });

  it('marks blank answers and unanswered prompts as unjudgeable', async () => {
    const blank = await buildTask(jest.fn().mockResolvedValue(answered({ message: '  ' })))(
      example
    );
    const prompted = await buildTask(jest.fn().mockResolvedValue(answered({ prompts: [{}] })))(
      example
    );

    expect(blank).toMatchObject({ errorCode: 'empty_answer', finalResponse: null });
    expect(prompted).toMatchObject({ errorCode: 'unanswered_prompts', finalResponse: null });
    expect(mockedDelete).toHaveBeenCalledTimes(2);
  });

  it('fails the experiment when cleanup fails', async () => {
    mockedDelete.mockRejectedValue(new Error('delete failed'));

    await expect(buildTask(jest.fn().mockResolvedValue(answered()))(example)).rejects.toThrow(
      /delete failed/
    );
  });

  it('throws for an example with no loaded history', async () => {
    const task = createLongMemEvalTask({
      agentBuilderClient: { converse: jest.fn() },
      agentId: 'agent',
      esClient,
      histories: new Map(),
      log,
    });

    await expect(task(example)).rejects.toThrow(/No history loaded for example q1/);
  });
});
