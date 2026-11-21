/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type {
  ConcreteTaskInstance,
  RunContext,
  TaskRegisterDefinition,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowsClient } from '@kbn/workflows/server/types';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { LUCID_DREAMING_BATCH_READY_TRIGGER_ID } from '../../common/lucid_dreaming';
import type { AiIndexService } from '../ai_indices/service';
import { findNewTraceRounds } from '../dreaming/trace_rounds';
import { readNewMemories } from './read_new_memories';
import {
  LUCID_DREAMING_TASK_TYPE,
  LUCID_INITIAL_LOOKBACK_MS,
  LUCID_MEMORY_BATCH_SIZE,
  registerLucidDreamingTaskDefinition,
  watchForLucidDreaming,
} from './task';

jest.mock('./read_new_memories');
jest.mock('../dreaming/trace_rounds');

const readNewMemoriesMock = readNewMemories as jest.MockedFunction<typeof readNewMemories>;
const findNewTraceRoundsMock = findNewTraceRounds as jest.MockedFunction<typeof findNewTraceRounds>;

const NOW = Date.parse('2026-11-20T12:00:00.000Z');
const MINUTE = 60 * 1000;
const SPACE = 'marketing';
const ago = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString();

const aiIndex = (overrides: Partial<AiIndexItem> = {}): AiIndexItem => ({
  id: 'support',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-support' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-11-01T00:00:00.000Z',
  date_modified: '2026-11-01T00:00:00.000Z',
  dreaming: { enabled: true, facts: [{ type: 'note' }], lucid: { enabled: true } },
  ...overrides,
});

const memories = (count: number, minutesAgo: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `memory-${i}`, updatedAt: ago(minutesAgo) }));

describe('watchForLucidDreaming', () => {
  const esClient = {} as ElasticsearchClient;
  let emit: jest.Mock;

  const watch = (overrides: Partial<Parameters<typeof watchForLucidDreaming>[0]> = {}) =>
    watchForLucidDreaming({
      aiIndex: aiIndex(),
      spaceId: SPACE,
      state: {},
      esClient,
      emit,
      now: NOW,
      signal: new AbortController().signal,
      logger: loggingSystemMock.createLogger(),
      ...overrides,
    });

  beforeEach(() => {
    jest.resetAllMocks();
    emit = jest.fn().mockResolvedValue(undefined);
    readNewMemoriesMock.mockResolvedValue([]);
    findNewTraceRoundsMock.mockResolvedValue({ rounds: [], capped: false, sources: [] });
  });

  it('starts a new watcher a day back, and keeps that start when nothing is new', async () => {
    const state = await watch();

    expect(readNewMemoriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-support',
        spaceId: SPACE,
        since: new Date(NOW - LUCID_INITIAL_LOOKBACK_MS).toISOString(),
        afterId: '',
      })
    );
    expect(emit).not.toHaveBeenCalled();
    expect(state).toEqual({
      memories_since: new Date(NOW - LUCID_INITIAL_LOOKBACK_MS).toISOString(),
      traces_since: new Date(NOW - LUCID_INITIAL_LOOKBACK_MS).toISOString(),
    });
  });

  it('reports full batches of memories and moves the cursor past them', async () => {
    const found = memories(LUCID_MEMORY_BATCH_SIZE + 1, 0.1);
    readNewMemoriesMock.mockResolvedValue(found);

    const state = await watch({ state: { memories_since: ago(60), memories_after_id: 'x' } });

    expect(readNewMemoriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ since: ago(60), afterId: 'x' })
    );
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith({
      ai_index_id: 'support',
      source: 'memories',
      memory_ids: found.slice(0, LUCID_MEMORY_BATCH_SIZE).map(({ id }) => id),
    });
    const last = found[LUCID_MEMORY_BATCH_SIZE - 1];
    expect(state).toEqual(
      expect.objectContaining({ memories_since: last.updatedAt, memories_after_id: last.id })
    );
  });

  it('reports a small batch once it has waited, so a quiet AI index still dreams', async () => {
    readNewMemoriesMock.mockResolvedValue(memories(3, 5));

    await watch();

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ memory_ids: ['memory-0', 'memory-1', 'memory-2'] })
    );
  });

  it('keeps the cursor before a batch it could not report, to report it again next run', async () => {
    readNewMemoriesMock.mockResolvedValue(memories(LUCID_MEMORY_BATCH_SIZE * 2, 0.5));
    emit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('queue full'));

    const state = await watch();

    expect(emit).toHaveBeenCalledTimes(2);
    expect(state.memories_after_id).toBe(`memory-${LUCID_MEMORY_BATCH_SIZE - 1}`);
    expect(findNewTraceRoundsMock).not.toHaveBeenCalled();
  });

  it('reports settled agent rounds by trace id, when the AI index has trace sources', async () => {
    const traces = [{ type: 'agent', value: 'support-agent', query: 'FROM traces-*' }];
    findNewTraceRoundsMock.mockResolvedValue({
      rounds: [{ traceId: 't1', lastAt: ago(10), target: 'traces-*' }],
      capped: false,
      sources: [{ type: 'agent', value: 'support-agent', rounds: 1 }],
    });

    const state = await watch({ aiIndex: aiIndex({ traces } as Partial<AiIndexItem>) });

    expect(findNewTraceRoundsMock).toHaveBeenCalledWith(
      expect.objectContaining({ traces, until: ago(1) })
    );
    expect(emit).toHaveBeenCalledWith({
      ai_index_id: 'support',
      source: 'traces',
      rounds: [{ trace_id: 't1', ended_at: ago(10) }],
    });
    expect(state).toEqual(expect.objectContaining({ traces_since: ago(10), traces_after: 't1' }));
  });

  it('does not look for rounds without trace sources', async () => {
    await watch();
    expect(findNewTraceRoundsMock).not.toHaveBeenCalled();
  });

  it('stops reporting once aborted', async () => {
    readNewMemoriesMock.mockResolvedValue(memories(LUCID_MEMORY_BATCH_SIZE, 0.5));
    const controller = new AbortController();
    controller.abort();

    await watch({ signal: controller.signal });

    expect(emit).not.toHaveBeenCalled();
  });
});

describe('registerLucidDreamingTaskDefinition', () => {
  let definition: TaskRegisterDefinition;
  let aiIndexService: jest.Mocked<Pick<AiIndexService, 'get'>>;
  let workflowsClient: jest.Mocked<Pick<WorkflowsClient, 'isWorkflowsAvailable' | 'emitEvent'>>;

  const run = ({ withUser = true }: { withUser?: boolean } = {}) =>
    definition
      .createTaskRunner({
        taskInstance: {
          params: { aiIndexId: 'support', spaceId: SPACE },
          state: {},
        } as unknown as ConcreteTaskInstance,
        fakeRequest: withUser ? httpServerMock.createKibanaRequest() : undefined,
        signal: new AbortController().signal,
      } as RunContext)
      .run();

  beforeEach(() => {
    jest.resetAllMocks();
    readNewMemoriesMock.mockResolvedValue(memories(3, 5));
    aiIndexService = { get: jest.fn().mockResolvedValue(aiIndex()) };
    workflowsClient = { isWorkflowsAvailable: true, emitEvent: jest.fn() };
    const taskManager = taskManagerMock.createSetup();
    registerLucidDreamingTaskDefinition({
      taskManager,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      isDreamingAvailable: async () => true,
      getScopedEsClient: async () => ({} as ElasticsearchClient),
      getWorkflowsClient: async () => workflowsClient as unknown as WorkflowsClient,
      logger: loggingSystemMock.createLogger(),
      getCurrentDate: () => new Date(NOW),
    });
    definition = taskManager.registerTaskDefinitions.mock.calls[0][0][LUCID_DREAMING_TASK_TYPE];
  });

  it('emits the batches it finds as the user who turned lucid dreaming on', async () => {
    const result = await run();

    expect(workflowsClient.emitEvent).toHaveBeenCalledWith(LUCID_DREAMING_BATCH_READY_TRIGGER_ID, {
      ai_index_id: 'support',
      source: 'memories',
      memory_ids: ['memory-0', 'memory-1', 'memory-2'],
    });
    expect(result).toEqual({ state: expect.objectContaining({ memories_after_id: 'memory-2' }) });
  });

  it.each([
    ['lucid dreaming is off', { dreaming: { enabled: true, facts: [{ type: 'note' }] } }],
    ['dreaming is off', { dreaming: { enabled: false, lucid: { enabled: true } } }],
  ])('deletes itself when %s', async (_, overrides) => {
    aiIndexService.get.mockResolvedValue(aiIndex(overrides as Partial<AiIndexItem>));

    expect(await run()).toEqual({ state: {}, shouldDeleteTask: true });
    expect(workflowsClient.emitEvent).not.toHaveBeenCalled();
  });

  it('fails for good without a user to run as', async () => {
    await expect(run({ withUser: false })).rejects.toThrow('has no user to run as');
  });
});
