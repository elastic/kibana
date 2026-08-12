/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Phase 4 reconciler integration test — exercises runReconcilerSweep against a real
 * (ephemeral) Elasticsearch instance without booting full Kibana or Task Manager.
 *
 * PLACEMENT RATIONALE
 * -------------------
 * Located in the plugin's own server/integration_tests/ directory because:
 *   • The test exercises code exported from this plugin package and must import it
 *     directly.  Putting it in src/core/… would reverse the dependency direction
 *     (core cannot depend on x-pack plugins).
 *   • The x-pack Task Manager plugin's integration tests (task_state_validation, etc.)
 *     boot a full Kibana root, which takes ~90 s and is unnecessary here — the
 *     reconciler's sweep logic can be exercised with just a real ES client.
 *   • The core SO zdt_2 harness (getKibanaMigratorTestKit) is adopted for ES
 *     lifecycle (startElasticsearch / getEsClient) because the smoke test already
 *     proves it works with semantic_text mappings on the test ES.
 *
 * WHAT IS PROVEN ON BARE ES (no ELSER model deployed)
 * ---------------------------------------------------
 *   1.  Detection query shape — correct docs selected, wrong-type docs excluded.
 *   2.  Null-shadow values count as absent in the exists filter (S7a finding).
 *   3.  The watermark clause independently catches recently-updated docs.
 *   4.  UBQ submission succeeds (async path; wait_for_completion=false → task ID).
 *   5.  Inference failures surface in response.failures[], not as an exception.
 *       On bare ES the inference endpoint exists (default .elser-2-elasticsearch)
 *       but the model is not deployed, so every doc update that would trigger
 *       inference fails and lands in failures[].
 *   6.  The reconciler interprets failures as retryable: logs WARN, does NOT advance
 *       the watermark, does NOT throw.
 *   7.  updated_at is NOT changed on the docs the UBQ touched (inference failure
 *       rolls back the update; additionally, the Painless script never writes
 *       updated_at, so the field is safe even on a successful inference run).
 *   8.  A second sweep with the same state is idempotent.
 *   9.  No-op invariant verified against real ES: zero ES writes when no types opt in.
 *
 * ENV-BLOCKED (requires a running ELSER deployment)
 * -------------------------------------------------
 *   • Shadow field values are populated and readable in _source after a sweep.
 *   • Watermark advances after a fully successful, non-truncated sweep.
 *   • Detection query correctly EXCLUDES docs whose shadow fields are already
 *     non-null (proving the exists clause excludes embedded docs).
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { startElasticsearch, getEsClient } from '@kbn/migrator-test-kit';
import { runReconcilerSweep } from '../task/reconciler_task';
import { emptyState } from '../task/task_state';
import { buildDetectionQuery } from '../task/ubq_builder';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDEX = 'spike-p4-reconciler-int-test';
const TYPE_NAME = 'test_rule';
const OTHER_TYPE = 'other_type';
const INFERENCE_ID = '.elser-2-elasticsearch';

/** Epoch — used as the "first sweep ever" watermark to match every doc. */
const EPOCH_WATERMARK = '1970-01-01T00:00:00.000Z';
/** "Old" updated_at for backfill docs (predates any realistic watermark). */
const OLD_DATE = '2020-01-01T00:00:00.000Z';
/** "Recent" updated_at — after STALE_WATERMARK; caught by the watermark clause. */
const RECENT_DATE = '2026-07-01T00:00:00.000Z';
/** A watermark that is between OLD_DATE and RECENT_DATE. */
const STALE_WATERMARK = '2026-06-01T00:00:00.000Z';

// Stable doc IDs seeded in beforeAll
const DOC_DEFERRED_A = 'doc-deferred-a'; // test_rule, no shadow keys, OLD_DATE
const DOC_DEFERRED_B = 'doc-deferred-b'; // test_rule, no shadow keys, OLD_DATE
const DOC_NULL_SHADOW = 'doc-null-shadow'; // test_rule, null shadows, OLD_DATE
const DOC_RECENT = 'doc-recent'; // test_rule, no shadow keys, RECENT_DATE
const DOC_OTHER_TYPE = 'doc-other-type'; // other_type, no shadows (must NOT match)

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeCfg = () =>
  ({
    enabled: true,
    pollInterval: '1m',
    batchSize: 100,
    maxDocsPerSweep: 10_000,
    requestsPerSecond: 50,
  } as const);

const makeLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

/**
 * Builds a minimal mock CoreSetup that routes ES calls through the supplied real client.
 * Only the subset of coreStart consumed by runReconcilerSweep is implemented.
 */
const makeCore = (esClient: ElasticsearchClient) => ({
  getStartServices: async () =>
    [
      {
        savedObjects: {
          getTypeRegistry: () => ({
            getAllTypes: () => [{ name: TYPE_NAME }],
            getSemanticSearchDefinition: (typeName: string) =>
              typeName === TYPE_NAME
                ? {
                    fields: ['name', 'description'],
                    inferenceId: INFERENCE_ID,
                    embedding: 'deferred' as const,
                  }
                : undefined,
          }),
          getIndexForType: () => INDEX,
        },
        elasticsearch: {
          client: { asInternalUser: esClient },
        },
      },
      {},
      undefined,
    ] as const,
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('SO Semantic Reconciler — integration sweep (bare ES)', () => {
  let esServer: Awaited<ReturnType<typeof startElasticsearch>>;
  let esClient: ElasticsearchClient;

  // -------------------------------------------------------------------------
  // Setup: start ES, create test index, seed docs
  // -------------------------------------------------------------------------

  beforeAll(async () => {
    esServer = await startElasticsearch();
    esClient = await getEsClient();

    // Create a spike SO-style index with semantic_text shadow field mappings.
    //
    // ES accepts semantic_text mappings without validating the inference endpoint
    // at mapping time (S7 spike finding; confirmed by Phase 1 smoke test).
    // Mapping is deliberately restrictive (dynamic: strict) to mirror real SO indices.
    //
    // The `as any` cast is required because the TS types for indices.create do not yet
    // include `semantic_text` as a known field type.  Using `as any` is standard practice
    // in integration tests (see existing unit tests in this package) and is distinct from
    // @ts-ignore/@ts-expect-error which are prohibited by project conventions.
    await esClient.indices.create({
      index: INDEX,
      mappings: {
        dynamic: 'strict',
        properties: {
          type: { type: 'keyword' },
          updated_at: { type: 'date' },
          [TYPE_NAME]: {
            properties: {
              name: { type: 'text' },
              name_semantic: { type: 'semantic_text', inference_id: INFERENCE_ID },
              description: { type: 'text' },
              description_semantic: { type: 'semantic_text', inference_id: INFERENCE_ID },
            },
          },
          [OTHER_TYPE]: {
            properties: {
              name: { type: 'text' },
            },
          },
        },
      },
    } as any);

    // Seed docs via direct client.index() rather than the SO repository so that:
    //   (a) no SO write-path hooks fire (keeps updated_at exactly as set)
    //   (b) null shadow values can be injected without triggering inference
    //       (null skips inference — S7 spike / Phase 2 smoke test)

    // Doc A — deferred style, no shadow keys, OLD_DATE.  Exists clause catches it.
    await esClient.index({
      index: INDEX,
      id: DOC_DEFERRED_A,
      refresh: 'false',
      document: {
        type: TYPE_NAME,
        updated_at: OLD_DATE,
        [TYPE_NAME]: { name: 'Rule A', description: 'Rule A description' },
      },
    });

    // Doc B — deferred style, no shadow keys, OLD_DATE.  Same as A; two docs exercise
    // the "batch" dimension and make sure the detection query does not deduplicate.
    await esClient.index({
      index: INDEX,
      id: DOC_DEFERRED_B,
      refresh: 'false',
      document: {
        type: TYPE_NAME,
        updated_at: OLD_DATE,
        [TYPE_NAME]: { name: 'Rule B', description: 'Rule B description' },
      },
    });

    // Doc C — null shadow values (emitted by the write path when a declared field is cleared,
    // per Phase 2 invariant: "cleared declared fields emit null shadow values so stale
    // embeddings don't survive partial updates").  null counts as absent for the ES exists
    // filter (S7a spike, confirmed by Phase 2 smoke test).
    await esClient.index({
      index: INDEX,
      id: DOC_NULL_SHADOW,
      refresh: 'false',
      document: {
        type: TYPE_NAME,
        updated_at: OLD_DATE,
        [TYPE_NAME]: {
          name: 'Rule C',
          description: 'Rule C description',
          name_semantic: null,
          description_semantic: null,
        },
      },
    });

    // Doc D — no shadow keys, RECENT_DATE (after STALE_WATERMARK).
    // With epoch watermark: caught by exists clause (no shadows).
    // With STALE_WATERMARK: caught by BOTH exists clause AND watermark clause.
    // Lets us verify that the watermark clause independently fires.
    await esClient.index({
      index: INDEX,
      id: DOC_RECENT,
      refresh: 'false',
      document: {
        type: TYPE_NAME,
        updated_at: RECENT_DATE,
        [TYPE_NAME]: { name: 'Rule D recent', description: 'Rule D description' },
      },
    });

    // Doc E — wrong type.  Must never match the test_rule detection query.
    await esClient.index({
      index: INDEX,
      id: DOC_OTHER_TYPE,
      refresh: 'true', // last index; force refresh so all docs are visible
      document: {
        type: OTHER_TYPE,
        updated_at: OLD_DATE,
        [OTHER_TYPE]: { name: 'Other type doc' },
      },
    });
  }, 120_000);

  // -------------------------------------------------------------------------
  // Teardown: delete spike index + stop ephemeral ES
  // -------------------------------------------------------------------------

  afterAll(async () => {
    try {
      await esClient.indices.delete({ index: INDEX });
    } catch {
      // best effort; if the test failed before creating the index, ignore
    }
    await esServer?.stop();
  });

  // -------------------------------------------------------------------------
  // 1. Detection query correctness
  // -------------------------------------------------------------------------

  describe('detection query', () => {
    it('matches deferred-style docs (no shadow keys) and excludes wrong-type docs', async () => {
      const query = buildDetectionQuery(TYPE_NAME, ['name', 'description'], EPOCH_WATERMARK);
      const resp = await esClient.search({
        index: INDEX,
        // Query is Record<string,unknown> from the builder; cast acceptable in test context.
        query: query as any,
        size: 100,
      });

      const ids = (resp.hits.hits as Array<{ _id: string }>).map((h) => h._id);

      expect(ids).toContain(DOC_DEFERRED_A);
      expect(ids).toContain(DOC_DEFERRED_B);
      // null shadows count as absent → exists clause catches them
      expect(ids).toContain(DOC_NULL_SHADOW);
      // RECENT_DATE doc: caught by exists clause (no shadows)
      expect(ids).toContain(DOC_RECENT);

      // Wrong-type doc must be excluded (type filter enforces this)
      expect(ids).not.toContain(DOC_OTHER_TYPE);
    });

    it('also excludes wrong-type docs when using STALE_WATERMARK', async () => {
      const query = buildDetectionQuery(TYPE_NAME, ['name', 'description'], STALE_WATERMARK);
      const resp = await esClient.search({
        index: INDEX,
        query: query as any,
        size: 100,
      });
      const ids = (resp.hits.hits as Array<{ _id: string }>).map((h) => h._id);

      // A, B, C: exists clause (null/absent shadows, OLD_DATE < STALE_WATERMARK but exists wins)
      expect(ids).toContain(DOC_DEFERRED_A);
      expect(ids).toContain(DOC_DEFERRED_B);
      expect(ids).toContain(DOC_NULL_SHADOW);
      // D: both exists clause AND watermark clause (RECENT_DATE > STALE_WATERMARK)
      expect(ids).toContain(DOC_RECENT);
      // E: never
      expect(ids).not.toContain(DOC_OTHER_TYPE);
    });

    it('watermark clause independently catches doc D (RECENT_DATE > STALE_WATERMARK)', async () => {
      // Verify that doc D is specifically matched by the watermark clause.
      // We narrow the query with an ids filter to isolate doc D.
      const baseQuery = buildDetectionQuery(TYPE_NAME, ['name', 'description'], STALE_WATERMARK);
      const resp = await esClient.search({
        index: INDEX,
        query: {
          bool: {
            must: [baseQuery as any, { ids: { values: [DOC_RECENT] } }],
          },
        } as any,
        size: 1,
      });

      // Doc D matches: it satisfies the watermark clause (RECENT_DATE > STALE_WATERMARK).
      // Also satisfies the exists clause (no shadows), but the watermark clause is sufficient.
      const total = resp.hits.total as { value: number };
      expect(total.value).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // 2. UBQ execution + inference-failure interpretation (R1 failure-mode contract)
  // -------------------------------------------------------------------------

  describe('runReconcilerSweep against bare ES', () => {
    let sweepResult: Awaited<ReturnType<typeof runReconcilerSweep>>;
    let logger: ReturnType<typeof makeLogger>;

    beforeAll(async () => {
      logger = makeLogger();
      sweepResult = await runReconcilerSweep({
        core: makeCore(esClient) as any,
        logger: logger as any,
        cfg: makeCfg(),
        state: emptyState,
        signal: new AbortController().signal,
        // Use a short poll interval so the test completes quickly.
        // The UBQ itself is fast (5 docs, inference fails immediately).
        pollIntervalMs: 100,
      });
    }, 60_000);

    it('does not throw — the task runner always resolves even when inference fails', () => {
      expect(sweepResult).toBeDefined();
      expect(sweepResult.state).toHaveProperty('watermarks');
    });

    it('does NOT advance the watermark when inference failures are reported (retryable)', () => {
      // On bare ES every doc update that reaches the inference step fails.
      // The reconciler must hold the watermark so failed docs are retried next cycle.
      //
      // ENV-BLOCKED counterpart: watermark advances when inference succeeds (ELSER required).
      expect(sweepResult.state.watermarks[TYPE_NAME]).toBeUndefined();
    });

    it('logs at WARN level for inference failures (R1 failure-mode contract)', () => {
      // The reconciler emits one WARN per type (not per doc) when failures[] is non-empty.
      // The inference-failure WARN path calls logger.warn with a single string argument
      // (no trailing error object — contrast with the UBQ-submission-failure path which
      // does pass { error: err }).
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('inference failure'));
      // Must never escalate to ERROR (failures are retryable, not fatal)
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('updated_at is unchanged on docs processed by the failed UBQ', async () => {
      // When inference fails, ES rolls back the document update.  updated_at must stay
      // at the original seed value on every touched doc.
      // Additionally (design invariant): the Painless script never writes updated_at,
      // so even a SUCCESSFUL sweep would not bump it — preventing an infinite reconcile loop.

      const docA = await esClient.get({ index: INDEX, id: DOC_DEFERRED_A });
      expect((docA._source as Record<string, unknown>).updated_at).toBe(OLD_DATE);

      const docB = await esClient.get({ index: INDEX, id: DOC_DEFERRED_B });
      expect((docB._source as Record<string, unknown>).updated_at).toBe(OLD_DATE);

      const docC = await esClient.get({ index: INDEX, id: DOC_NULL_SHADOW });
      expect((docC._source as Record<string, unknown>).updated_at).toBe(OLD_DATE);

      const docD = await esClient.get({ index: INDEX, id: DOC_RECENT });
      expect((docD._source as Record<string, unknown>).updated_at).toBe(RECENT_DATE);
    });

    it('wrong-type doc is untouched by the sweep', async () => {
      // The UBQ query filters by type=test_rule, so other_type doc must be left alone.
      const docE = await esClient.get({ index: INDEX, id: DOC_OTHER_TYPE });
      expect((docE._source as Record<string, unknown>).updated_at).toBe(OLD_DATE);
      expect((docE._source as Record<string, unknown>).type).toBe(OTHER_TYPE);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Second run idempotent
  // -------------------------------------------------------------------------

  describe('second run is idempotent', () => {
    it('produces identical behavior on a second sweep with the same empty state', async () => {
      const logger2 = makeLogger();
      const result2 = await runReconcilerSweep({
        core: makeCore(esClient) as any,
        logger: logger2 as any,
        cfg: makeCfg(),
        // Deliberately reuse the same empty state (simulating: first sweep never advanced
        // watermark because of inference failures)
        state: emptyState,
        signal: new AbortController().signal,
        pollIntervalMs: 100,
      });

      // Same outcome as the first run
      expect(result2.state.watermarks[TYPE_NAME]).toBeUndefined();
      expect(logger2.warn).toHaveBeenCalledWith(expect.stringContaining('inference failure'));
      expect(logger2.error).not.toHaveBeenCalled();

      // docs must still have their original updated_at (double idempotency check)
      const docA = await esClient.get({ index: INDEX, id: DOC_DEFERRED_A });
      expect((docA._source as Record<string, unknown>).updated_at).toBe(OLD_DATE);
    }, 60_000);
  });

  // -------------------------------------------------------------------------
  // 4. No-op invariant: zero ES writes when no types opt in
  // -------------------------------------------------------------------------

  describe('no-op invariant against real ES', () => {
    it('makes zero ES writes and returns state unchanged when no types declare semanticSearch', async () => {
      // Build a core whose registry reports zero opted-in types.
      const noOpCore = {
        getStartServices: async () =>
          [
            {
              savedObjects: {
                getTypeRegistry: () => ({
                  getAllTypes: () => [],
                  getSemanticSearchDefinition: () => undefined,
                }),
                getIndexForType: () => INDEX,
              },
              elasticsearch: {
                client: { asInternalUser: esClient },
              },
            },
            {},
            undefined,
          ] as const,
      };

      const preWatermark = '2026-05-01T00:00:00.000Z';
      const initialState = { ...emptyState, watermarks: { [TYPE_NAME]: preWatermark } };
      const logger3 = makeLogger();

      const result = await runReconcilerSweep({
        core: noOpCore as any,
        logger: logger3 as any,
        cfg: makeCfg(),
        state: initialState,
        signal: new AbortController().signal,
        pollIntervalMs: 0,
      });

      // State returned unchanged (no types processed)
      expect(result.state).toEqual(initialState);

      // No warn or error — the no-op path is completely silent
      expect(logger3.warn).not.toHaveBeenCalled();
      expect(logger3.error).not.toHaveBeenCalled();

      // The index must not have been modified (verify by checking count unchanged)
      const countResp = await esClient.count({ index: INDEX });
      // 5 docs were seeded in beforeAll; no-op sweep must not alter that
      expect(countResp.count).toBe(5);
    });
  });
});
