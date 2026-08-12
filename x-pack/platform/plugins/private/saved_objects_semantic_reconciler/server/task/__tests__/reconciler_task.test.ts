/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TASK_TYPE,
  TASK_ID,
  registerReconcilerTask,
  ensureReconcilerScheduled,
  runReconcilerSweep,
} from '../reconciler_task';
import { emptyState, type ReconcilerTaskState } from '../task_state';
import type { ReconcilerConfig } from '../../config';

// ---------------------------------------------------------------------------
// Helpers / mocks
// ---------------------------------------------------------------------------

const makeCfg = (overrides: Partial<ReconcilerConfig> = {}): ReconcilerConfig => ({
  enabled: true,
  pollInterval: '1m',
  batchSize: 100,
  maxDocsPerSweep: 10_000,
  requestsPerSecond: 50,
  ...overrides,
});

const makeRegistry = (types: Array<{ name: string; fields: string[] }>) => {
  const defs = new Map(
    types.map(({ name, fields }) => [
      name,
      { fields, inferenceId: '.elser-2-elasticsearch', embedding: 'deferred' as const },
    ])
  );
  return {
    getAllTypes: jest.fn(() => types.map(({ name }) => ({ name }))),
    getSemanticSearchDefinition: jest.fn((typeName: string) => defs.get(typeName)),
  };
};

const makeEsClient = (overrides: Record<string, jest.Mock> = {}) => ({
  updateByQuery: jest.fn().mockResolvedValue({ task: 'node:1234' }),
  count: jest.fn().mockResolvedValue({ count: 5 }),
  delete: jest.fn().mockResolvedValue({}),
  tasks: {
    get: jest.fn().mockResolvedValue({
      completed: true,
      response: { total: 5, updated: 5, version_conflicts: 0, failures: [] },
    }),
    cancel: jest.fn().mockResolvedValue({}),
  },
  ...overrides,
});

const makeCoreStart = (
  registry: ReturnType<typeof makeRegistry>,
  esClient: ReturnType<typeof makeEsClient>,
  extraSO: Record<string, jest.Mock> = {}
) => ({
  savedObjects: {
    getTypeRegistry: jest.fn(() => registry),
    getIndexForType: jest.fn(() => '.kibana'),
    ...extraSO,
  },
  elasticsearch: {
    client: { asInternalUser: esClient },
  },
});

const makeCore = (coreStart: ReturnType<typeof makeCoreStart>) => ({
  getStartServices: jest.fn().mockResolvedValue([coreStart, {}, undefined]),
});

const makeAbortSignal = (aborted = false): AbortSignal =>
  ({
    aborted,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    reason: undefined,
    onabort: null,
    throwIfAborted: jest.fn(),
  } as unknown as AbortSignal);

/** Build a complete ReconcilerTaskState with optional watermarks override. */
const makeState = (watermarks: Record<string, string> = {}): ReconcilerTaskState => ({
  ...emptyState,
  watermarks,
});

// ---------------------------------------------------------------------------
// Task registration
// ---------------------------------------------------------------------------

describe('registerReconcilerTask', () => {
  it('registers a task definition with the correct type key', () => {
    const taskManager = { registerTaskDefinitions: jest.fn() };
    const core = makeCore(makeCoreStart(makeRegistry([]), makeEsClient()));
    registerReconcilerTask(
      taskManager as any,
      core as any,
      { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      makeCfg()
    );
    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    const defs = taskManager.registerTaskDefinitions.mock.calls[0][0];
    expect(defs).toHaveProperty(TASK_TYPE);
  });

  it('uses 30m timeout on the definition', () => {
    const taskManager = { registerTaskDefinitions: jest.fn() };
    const core = makeCore(makeCoreStart(makeRegistry([]), makeEsClient()));
    registerReconcilerTask(
      taskManager as any,
      core as any,
      {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as any,
      makeCfg()
    );
    const def = taskManager.registerTaskDefinitions.mock.calls[0][0][TASK_TYPE];
    expect(def.timeout).toBe('30m');
  });
});

// ---------------------------------------------------------------------------
// Scheduling gating
// ---------------------------------------------------------------------------

describe('ensureReconcilerScheduled', () => {
  it('does NOT call ensureScheduled when no types opt in', async () => {
    const taskManager = { ensureScheduled: jest.fn() };
    const registry = makeRegistry([]);
    const core = makeCore(makeCoreStart(registry, makeEsClient()));
    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    await ensureReconcilerScheduled(taskManager as any, core as any, logger as any, makeCfg());
    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('No types declare semanticSearch')
    );
  });

  it('calls ensureScheduled with the correct task ID and interval when types opt in', async () => {
    const taskManager = { ensureScheduled: jest.fn().mockResolvedValue(undefined) };
    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, makeEsClient()));
    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    await ensureReconcilerScheduled(taskManager as any, core as any, logger as any, makeCfg());
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TASK_ID,
        taskType: TASK_TYPE,
        schedule: { interval: '1m' },
      })
    );
  });

  it('uses the configured pollInterval in the schedule', async () => {
    const taskManager = { ensureScheduled: jest.fn().mockResolvedValue(undefined) };
    const registry = makeRegistry([{ name: 'rule', fields: ['name'] }]);
    const core = makeCore(makeCoreStart(registry, makeEsClient()));
    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    await ensureReconcilerScheduled(
      taskManager as any,
      core as any,
      logger as any,
      makeCfg({ pollInterval: '5m' })
    );
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: { interval: '5m' } })
    );
  });

  it('logs error but does not throw if ensureScheduled rejects', async () => {
    const taskManager = {
      ensureScheduled: jest.fn().mockRejectedValue(new Error('TM unavailable')),
    };
    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, makeEsClient()));
    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    await expect(
      ensureReconcilerScheduled(taskManager as any, core as any, logger as any, makeCfg())
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to schedule'),
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// No-op invariant
// ---------------------------------------------------------------------------

describe('runReconcilerSweep — no-op invariant', () => {
  it('returns unchanged state and makes zero ES calls when no types opt in', async () => {
    const esClient = makeEsClient();
    const registry = makeRegistry([]);
    const core = makeCore(makeCoreStart(registry, esClient));
    const initialState = makeState({ dashboard: '2026-01-01T00:00:00.000Z' });

    const { state } = await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg(),
      state: initialState,
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    expect(esClient.updateByQuery).not.toHaveBeenCalled();
    expect(esClient.tasks.get).not.toHaveBeenCalled();
    expect(state).toEqual(initialState);
  });
});

// ---------------------------------------------------------------------------
// Successful sweep
// ---------------------------------------------------------------------------

describe('runReconcilerSweep — successful sweep', () => {
  it('submits one UBQ per opted-in type and advances the watermark on full success', async () => {
    const esClient = makeEsClient();
    const registry = makeRegistry([{ name: 'dashboard', fields: ['title', 'description'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    const { state } = await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg(),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
    expect(esClient.tasks.get).toHaveBeenCalledTimes(1);
    // Watermark must be set to an ISO date after the run
    expect(state.watermarks.dashboard).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('submits one UBQ per type for multi-type registrations', async () => {
    const esClient = makeEsClient();
    const registry = makeRegistry([
      { name: 'dashboard', fields: ['title'] },
      { name: 'lens', fields: ['title', 'description'] },
    ]);
    const core = makeCore(makeCoreStart(registry, esClient));

    await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg(),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
  });

  it('passes the correct index, conflicts, scroll_size, max_docs, requests_per_second to UBQ', async () => {
    const esClient = makeEsClient();
    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg({ batchSize: 50, maxDocsPerSweep: 500, requestsPerSecond: 25 }),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    const [callArgs] = esClient.updateByQuery.mock.calls[0];
    expect(callArgs.index).toBe('.kibana');
    expect(callArgs.conflicts).toBe('proceed');
    expect(callArgs.scroll_size).toBe(50);
    expect(callArgs.max_docs).toBe(500);
    expect(callArgs.requests_per_second).toBe(25);
    expect(callArgs.wait_for_completion).toBe(false);
  });

  it('uses the stored watermark from state in the detection query', async () => {
    const esClient = makeEsClient();
    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    const storedWatermark = '2026-06-01T12:00:00.000Z';
    await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg(),
      state: makeState({ dashboard: storedWatermark }),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    const body = esClient.updateByQuery.mock.calls[0][0];
    const queryStr = JSON.stringify(body.query);
    expect(queryStr).toContain(storedWatermark);
  });

  it('uses epoch watermark for a type not yet in state', async () => {
    const esClient = makeEsClient();
    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg(),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    const body = esClient.updateByQuery.mock.calls[0][0];
    const queryStr = JSON.stringify(body.query);
    expect(queryStr).toContain('1970-01-01T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Response interpretation — version conflicts
// ---------------------------------------------------------------------------

describe('runReconcilerSweep — version conflicts', () => {
  it('advances watermark even when version_conflicts > 0 (conflicts are benign)', async () => {
    const esClient = makeEsClient({
      updateByQuery: jest.fn().mockResolvedValue({ task: 'node:999' }),
    });
    esClient.tasks.get = jest.fn().mockResolvedValue({
      completed: true,
      response: { total: 10, updated: 9, version_conflicts: 1, failures: [] },
    });

    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    const { state } = await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg(),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    expect(state.watermarks.dashboard).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Response interpretation — inference failures
// ---------------------------------------------------------------------------

describe('runReconcilerSweep — inference failures', () => {
  it('does NOT advance watermark when failures[] is non-empty', async () => {
    const esClient = makeEsClient({
      updateByQuery: jest.fn().mockResolvedValue({ task: 'node:999' }),
    });
    esClient.tasks.get = jest.fn().mockResolvedValue({
      completed: true,
      response: {
        total: 10,
        updated: 0,
        version_conflicts: 0,
        failures: [
          {
            id: 'doc-1',
            cause: { type: 'resource_not_found_exception', reason: 'Inference id not found' },
            status: 404,
          },
        ],
      },
    });

    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));
    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const { state } = await runReconcilerSweep({
      core: core as any,
      logger: logger as any,
      cfg: makeCfg(),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    // Watermark must NOT be set
    expect(state.watermarks.dashboard).toBeUndefined();
    // Must log at WARN
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('inference failure'));
  });

  it('does not throw and task succeeds even with inference failures (R1 failure-mode contract)', async () => {
    const esClient = makeEsClient({
      updateByQuery: jest.fn().mockResolvedValue({ task: 'node:999' }),
    });
    esClient.tasks.get = jest.fn().mockResolvedValue({
      completed: true,
      response: {
        total: 5,
        updated: 0,
        failures: Array.from({ length: 5 }, (_, i) => ({
          id: `doc-${i}`,
          cause: { type: 'resource_not_found_exception', reason: 'Inference id not found' },
        })),
      },
    });

    const registry = makeRegistry([{ name: 'rule', fields: ['name'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    await expect(
      runReconcilerSweep({
        core: core as any,
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
        cfg: makeCfg(),
        state: makeState(),
        signal: makeAbortSignal(),
        pollIntervalMs: 0,
      })
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Response interpretation — truncation
// ---------------------------------------------------------------------------

describe('runReconcilerSweep — maxDocsPerSweep truncation', () => {
  it('does NOT advance watermark when total >= maxDocsPerSweep', async () => {
    const esClient = makeEsClient({
      updateByQuery: jest.fn().mockResolvedValue({ task: 'node:999' }),
    });
    esClient.tasks.get = jest.fn().mockResolvedValue({
      completed: true,
      response: { total: 500, updated: 500, version_conflicts: 0, failures: [] },
    });

    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    const { state } = await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      // maxDocsPerSweep=500 → total(500) >= 500 → truncated
      cfg: makeCfg({ maxDocsPerSweep: 500 }),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    expect(state.watermarks.dashboard).toBeUndefined();
  });

  it('advances watermark when total < maxDocsPerSweep', async () => {
    const esClient = makeEsClient({
      updateByQuery: jest.fn().mockResolvedValue({ task: 'node:999' }),
    });
    esClient.tasks.get = jest.fn().mockResolvedValue({
      completed: true,
      response: { total: 42, updated: 42, version_conflicts: 0, failures: [] },
    });

    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    const { state } = await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg({ maxDocsPerSweep: 500 }),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    expect(state.watermarks.dashboard).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Abort signal handling
// ---------------------------------------------------------------------------

describe('runReconcilerSweep — abort signal', () => {
  it('skips all types and returns current state immediately if signal is already aborted', async () => {
    const esClient = makeEsClient();
    const registry = makeRegistry([{ name: 'dashboard', fields: ['title'] }]);
    const core = makeCore(makeCoreStart(registry, esClient));

    const { state } = await runReconcilerSweep({
      core: core as any,
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
      cfg: makeCfg(),
      state: makeState(),
      signal: makeAbortSignal(true),
      pollIntervalMs: 0,
    });

    // No UBQ submitted because signal was aborted before the loop started
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
    expect(state.watermarks).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// UBQ submission failure (genuine bug / network error)
// ---------------------------------------------------------------------------

describe('runReconcilerSweep — UBQ submission failure', () => {
  it('logs and continues to next type when UBQ submission throws', async () => {
    const esClient = makeEsClient({
      updateByQuery: jest.fn().mockRejectedValue(new Error('index_not_found_exception')),
    });
    const registry = makeRegistry([
      { name: 'dashboard', fields: ['title'] },
      { name: 'lens', fields: ['description'] },
    ]);
    const core = makeCore(makeCoreStart(registry, esClient));
    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    // Should not throw
    const { state } = await runReconcilerSweep({
      core: core as any,
      logger: logger as any,
      cfg: makeCfg(),
      state: makeState(),
      signal: makeAbortSignal(),
      pollIntervalMs: 0,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('UBQ submission failed'),
      expect.anything()
    );
    // Neither type's watermark advanced
    expect(state.watermarks.dashboard).toBeUndefined();
    expect(state.watermarks.lens).toBeUndefined();
  });
});
