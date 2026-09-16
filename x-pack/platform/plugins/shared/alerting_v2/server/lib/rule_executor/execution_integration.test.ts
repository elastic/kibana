/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Execution integration test — Step 6.6
 *
 * Drives the compile → execute → enrich → store path end to end using a
 * **fixture** execution-time builder type, not the real detection types.
 * The fixture proves the framework machinery works; the Security schemas are
 * tested in the `@kbn/security-detection-rule-schema` package.
 *
 * Test levels:
 * - Unit-level (this file): mocked Elasticsearch. Chains all four pipeline
 *   steps: CompileRuleQueryStep → ExecuteRuleQueryStep →
 *   CreateAlertEventsStep → StoreAlertEventsStep.
 * - Scout-level: not possible without a dedicated test plugin. See the
 *   assessment comment at the bottom of this file.
 *
 * Ref: implementation-plan.md "Step 6.6"
 * Ref: rule-execution-logic.md "The compile step" and "Compilation failures"
 * Ref: rule-event-generation-logic.md "Where the hook runs"
 */

import { coreMock } from '@kbn/core/server/mocks';
import { ByteSizeValue } from '@kbn/config-schema';
import { z } from '@kbn/zod/v4';
import { TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import type { RegisteredBuilderType } from '@kbn/alerting-v2-rule-builders';
import { BuilderTypeRegistry } from '../builder_types';
import { FoldedVersionsSet } from '../builder_types/folded_versions';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { CompileRuleQueryStep } from './steps/compile_rule_query_step';
import { ExecuteRuleQueryStep } from './steps/execute_rule_query_step';
import { CreateAlertEventsStep } from './steps/create_alert_events_step';
import { StoreAlertEventsStep } from './steps/store_alert_events';
import type { PluginConfig } from '../../config';
import { createQueryService } from '../services/query_service/query_service.mock';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createMockStorageServiceContract } from '../services/storage_service/storage_service.mock';
import {
  collectStreamResults,
  createEsqlResponse,
  createPipelineStream,
  createRuleResponse,
  createRulePipelineState,
  getStepError,
} from './test_utils';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';

// ---------------------------------------------------------------------------
// Fixture builder type
// ---------------------------------------------------------------------------

/**
 * A minimal bounded schema for the fixture type.
 * All strings cap at 100 chars (below the 4 096-char ignore_above threshold)
 * so no manifest sub-field declaration is needed.
 */
const fixtureSchema = z
  .object({
    q: z.string().max(100),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    risk_score: z.number().int().min(0).max(100),
  })
  .strict();

type FixtureFields = z.infer<typeof fixtureSchema>;

const FIXTURE_TYPE_ID = 'fixture.exec';

/**
 * Builds a RegisteredBuilderType for the fixture execution-time type.
 * Individual tests may supply overrides to exercise specific failure paths.
 */
function makeFixtureDefinition(
  overrides: Partial<RegisteredBuilderType> = {}
): RegisteredBuilderType {
  return {
    type: FIXTURE_TYPE_ID,
    name: 'Fixture Execution-Time Type',
    compilation: 'execution_time',
    kind: 'signal',
    builderFieldsSchema: fixtureSchema as unknown as RegisteredBuilderType['builderFieldsSchema'],
    generateQuery: ({ fields }) => {
      const f = fields as unknown as FixtureFields;
      return {
        query: {
          format: 'standalone',
          breach: { query: `FROM fixture-index-* | WHERE KQL("${f.q}") | LIMIT 100` },
        },
      };
    },
    enrichRuleEvent: ({ fields, rule }) => {
      const f = fields as unknown as FixtureFields;
      return {
        severity: f.severity,
        data: {
          'kibana.alert.risk_score': f.risk_score,
          'kibana.alert.rule.rule_id': rule.signature_id,
        },
      };
    },
    ...overrides,
  };
}

/**
 * Creates a BuilderTypeRegistry that bypasses the manifest-fold consistency
 * check (the fixture type declares no manifest).
 */
function makeRegistry(...definitions: RegisteredBuilderType[]): BuilderTypeRegistry {
  const registry = new BuilderTypeRegistry().withFoldedVersions(new FoldedVersionsSet());
  for (const def of definitions) {
    registry.register(def);
  }
  return registry;
}

// ---------------------------------------------------------------------------
// Step factory helpers
// ---------------------------------------------------------------------------

function createPluginConfigAccessor() {
  const config: PluginConfig = {
    enabled: true,
    invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
    rules: {
      minimumScheduleInterval: '1m',
      maxScheduledPerMinute: 400,
      run: {
        alerts: { max: 10000 },
        maxGroupsPerExecution: 10000,
        query: { maxResponseSize: ByteSizeValue.parse('50mb') },
      },
    },
    esql: { responseFormat: 'json' },
  };
  return coreMock.createPluginInitializerContext<PluginConfig>(config).config;
}

interface PipelineSetup {
  compileStep: CompileRuleQueryStep;
  executeQueryStep: ExecuteRuleQueryStep;
  createEventsStep: CreateAlertEventsStep;
  storeEventsStep: StoreAlertEventsStep;
  mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  mockStorage: ReturnType<typeof createMockStorageServiceContract>;
}

function createPipeline(registry: BuilderTypeRegistry): PipelineSetup {
  const pluginConfigAccessor = createPluginConfigAccessor();
  const { queryService, mockEsClient } = createQueryService();
  const { loggerService } = createLoggerService();
  const mockStorage = createMockStorageServiceContract();

  const compileStep = new CompileRuleQueryStep(registry);
  const executeQueryStep = new ExecuteRuleQueryStep(queryService, pluginConfigAccessor);
  const createEventsStep = new CreateAlertEventsStep(loggerService, pluginConfigAccessor, registry);
  const storeEventsStep = new StoreAlertEventsStep(mockStorage);

  return {
    compileStep,
    executeQueryStep,
    createEventsStep,
    storeEventsStep,
    mockEsClient,
    mockStorage,
  };
}

// ---------------------------------------------------------------------------
// Pipeline-chain helpers
// ---------------------------------------------------------------------------

/**
 * Chains all four steps and collects results from the store step.
 * Simulates everything downstream of FetchRuleStep — the initial state
 * already carries the rule.
 */
async function runFullPipeline(
  pipeline: PipelineSetup,
  rule: ReturnType<typeof createRuleResponse>
) {
  const initialStream = createPipelineStream([createRulePipelineState({ rule })]);

  const compiled = pipeline.compileStep.executeStream(initialStream);
  const queried = pipeline.executeQueryStep.executeStream(compiled);
  const eventsCreated = pipeline.createEventsStep.executeStream(queried);
  const stored = pipeline.storeEventsStep.executeStream(eventsCreated);

  return collectStreamResults(stored);
}

/**
 * Chains up to CreateAlertEventsStep and collects, without hitting storage.
 * Used by assertions that inspect alertEventsBatch directly.
 */
async function runThroughCreateEvents(
  pipeline: PipelineSetup,
  rule: ReturnType<typeof createRuleResponse>
) {
  const initialStream = createPipelineStream([createRulePipelineState({ rule })]);

  const compiled = pipeline.compileStep.executeStream(initialStream);
  const queried = pipeline.executeQueryStep.executeStream(compiled);
  const eventsCreated = pipeline.createEventsStep.executeStream(queried);

  return collectStreamResults(eventsCreated);
}

/**
 * Runs only the compile step and returns any thrown error.
 * All four failure cases surface at compilation time, before events are built.
 */
async function runCompileOnly(
  pipeline: PipelineSetup,
  rule: ReturnType<typeof createRuleResponse>
): Promise<Error | undefined> {
  const state = createRulePipelineState({ rule });
  return getStepError(pipeline.compileStep, state);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Execution integration — fixture execution-time builder type (Step 6.6)', () => {
  // ─── Healthy run ─────────────────────────────────────────────────────────

  describe('healthy run', () => {
    const FIXTURE_FIELDS: FixtureFields = {
      q: 'host.name: breach-host',
      severity: 'high',
      risk_score: 75,
    };
    const SIGNATURE_ID = 'test-sig-001';

    let pipeline: PipelineSetup;
    let rule: ReturnType<typeof createRuleResponse>;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-01T12:00:00.000Z'));

      const registry = makeRegistry(makeFixtureDefinition());
      pipeline = createPipeline(registry);

      rule = createRuleResponse({
        kind: 'signal',
        schedule: { every: '5m', lookback: '10m' },
        metadata: {
          builder_type: FIXTURE_TYPE_ID,
          builder_fields: FIXTURE_FIELDS,
          signature_id: SIGNATURE_ID,
        },
      });

      // ES returns one query row for the execute step.
      pipeline.mockEsClient.esql.query.mockResolvedValue(
        createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['breach-host-1']])
      );

      // Storage succeeds trivially.
      pipeline.mockStorage.bulkIndexDocs.mockResolvedValue({
        attempted: 1,
        docs: [],
        errors: [],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('compile step: resolves effectiveQuery from builder_fields via generateQuery and sets executionWindow', async () => {
      const initialStream = createPipelineStream([createRulePipelineState({ rule })]);
      const results = await collectStreamResults(pipeline.compileStep.executeStream(initialStream));

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('continue');
      if (results[0].type !== 'continue') throw new Error('expected continue');

      const { effectiveQuery, executionWindow } = results[0].state;

      // effectiveQuery is derived from builder_fields by generateQuery — not rule.query.
      expect(effectiveQuery).toBeDefined();
      expect(effectiveQuery!.format).toBe('standalone');
      if (effectiveQuery!.format !== 'standalone') throw new Error('wrong format');
      expect(effectiveQuery!.breach.query).toContain('FROM fixture-index-* | WHERE KQL("');
      expect(effectiveQuery!.breach.query).toContain(FIXTURE_FIELDS.q);

      // Execution window is anchored at the fake now with the rule's 10-minute lookback.
      expect(executionWindow).toBeDefined();
      expect(executionWindow!.end).toBe('2025-06-01T12:00:00.000Z');
      expect(executionWindow!.start).toBe('2025-06-01T11:50:00.000Z');
    });

    it('execute step: passes the compiled query to Elasticsearch', async () => {
      await runFullPipeline(pipeline, rule);

      expect(pipeline.mockEsClient.esql.query).toHaveBeenCalledTimes(1);
      const [esqlArgs] = pipeline.mockEsClient.esql.query.mock.calls[0];
      // The query sent to ES must contain the text derived from builder_fields.q.
      expect(esqlArgs.query).toContain(FIXTURE_FIELDS.q);
    });

    it('create events step: enriches alert events with severity and data from the hook', async () => {
      const results = await runThroughCreateEvents(pipeline, rule);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('continue');
      if (results[0].type !== 'continue') throw new Error('expected continue');

      const batch = results[0].state.alertEventsBatch;
      expect(batch).toHaveLength(1);

      const doc = batch![0];
      // Hook severity wins over the absent row severity column.
      expect(doc.severity).toBe('high');
      // data is the row merged with hook data additions; hook wins on collisions.
      expect(doc.data).toMatchObject({
        'host.name': 'breach-host-1',
        'kibana.alert.risk_score': 75,
        'kibana.alert.rule.rule_id': SIGNATURE_ID,
      });
      // Type matches the fixture type's kind pin.
      expect(doc.type).toBe('signal');
      expect(doc.status).toBe('breached');
    });

    it('store step: receives the enriched documents and the full chain completes', async () => {
      const results = await runFullPipeline(pipeline, rule);

      // Every emission continues; no halt or error.
      for (const result of results) {
        expect(result.type).toBe('continue');
      }

      // Storage was called once with the enriched batch.
      expect(pipeline.mockStorage.bulkIndexDocs).toHaveBeenCalledTimes(1);
      const storageCall = pipeline.mockStorage.bulkIndexDocs.mock.calls[0][0];

      // docs carries the alert events produced by CreateAlertEventsStep.
      expect(storageCall.docs).toHaveLength(1);
      const stored = storageCall.docs[0] as Record<string, unknown>;
      expect(stored.severity).toBe('high');
      expect((stored.data as Record<string, unknown>)['kibana.alert.risk_score']).toBe(75);
      expect((stored.data as Record<string, unknown>)['kibana.alert.rule.rule_id']).toBe(
        SIGNATURE_ID
      );
    });
  });

  // ─── Failure cases ───────────────────────────────────────────────────────

  describe('failure cases', () => {
    let pipeline: PipelineSetup;

    beforeEach(() => {
      const registry = makeRegistry(makeFixtureDefinition());
      pipeline = createPipeline(registry);
    });

    /**
     * Failure 1: unknown builder type.
     * Ref: rule-execution-logic.md "Compilation failures" — UNKNOWN_BUILDER_TYPE
     */
    it('unknown builder type: fails the run with UNKNOWN_BUILDER_TYPE (user-source)', async () => {
      const rule = createRuleResponse({
        kind: 'signal',
        metadata: {
          builder_type: 'unknown.type.not.registered',
          builder_fields: { q: 'foo', severity: 'high', risk_score: 10 },
        },
      });

      const error = await runCompileOnly(pipeline, rule);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.UNKNOWN_BUILDER_TYPE);
    });

    /**
     * Failure 2: stored builder_fields that no longer parse the schema.
     * Ref: rule-execution-logic.md "Compilation failures" — INVALID_BUILDER_FIELDS
     */
    it('invalid stored fields: fails the run with INVALID_BUILDER_FIELDS (user-source)', async () => {
      const rule = createRuleResponse({
        kind: 'signal',
        metadata: {
          builder_type: FIXTURE_TYPE_ID,
          // q must be a string; a number simulates fields that predate a schema tightening.
          builder_fields: { q: 12345, severity: 'high', risk_score: 10 },
        },
      });

      const error = await runCompileOnly(pipeline, rule);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS);
    });

    /**
     * Failure 3: generateQuery throws.
     * Ref: rule-execution-logic.md "Compilation failures" — BUILDER_QUERY_GENERATION_FAILED
     */
    it('generator throws: fails the run with BUILDER_QUERY_GENERATION_FAILED (user-source)', async () => {
      const throwingRegistry = makeRegistry(
        makeFixtureDefinition({
          generateQuery: () => {
            throw new Error('Simulated generator failure');
          },
        })
      );
      const throwingPipeline = createPipeline(throwingRegistry);

      const rule = createRuleResponse({
        kind: 'signal',
        metadata: {
          builder_type: FIXTURE_TYPE_ID,
          builder_fields: { q: 'host.name: test', severity: 'high', risk_score: 10 },
        },
      });

      const error = await runCompileOnly(throwingPipeline, rule);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED);
    });

    /**
     * Failure 4: generator returns a result carrying a grouping override.
     * The execution-time no-overrides rule (rule-execution-logic.md "The
     * compilation contract") forbids grouping and time_field on compile results.
     * Ref: rule-execution-logic.md "Compilation failures" — BUILDER_QUERY_GENERATION_FAILED
     */
    it('generator returns grouping override: fails the run with BUILDER_QUERY_GENERATION_FAILED (user-source)', async () => {
      const overridingRegistry = makeRegistry(
        makeFixtureDefinition({
          // grouping overrides on execution-time results are explicitly rejected
          // by CompileRuleQueryStep before adaptToKind or the invariant checks run.
          generateQuery: () => ({
            query: { format: 'standalone', breach: { query: 'FROM fixture-* | LIMIT 10' } },
            grouping: { fields: ['host.name'] },
          }),
        })
      );
      const overridingPipeline = createPipeline(overridingRegistry);

      const rule = createRuleResponse({
        kind: 'signal',
        metadata: {
          builder_type: FIXTURE_TYPE_ID,
          builder_fields: { q: 'host.name: test', severity: 'high', risk_score: 10 },
        },
      });

      const error = await runCompileOnly(overridingPipeline, rule);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED);
    });

    /**
     * Failure 4 (second variant): generator returns a result that fails the
     * invariants — a signal-kind rule cannot run a recovery block.
     * Ref: GENERATED_QUERY_INVARIANTS + adaptToKind in generated_query_validation.ts
     */
    it('generator returns invalid query (recovery on signal rule): fails the run with BUILDER_QUERY_GENERATION_FAILED (user-source)', async () => {
      const invalidRegistry = makeRegistry(
        makeFixtureDefinition({
          generateQuery: () => ({
            // adaptToKind rejects a recovery block on a signal-kind rule.
            query: {
              format: 'composed' as const,
              base: 'FROM fixture-* | STATS count = COUNT(*) BY host.name',
              breach: { segment: 'WHERE count > 10' },
              recovery: { segment: 'WHERE count <= 10' },
            },
          }),
        })
      );
      const invalidPipeline = createPipeline(invalidRegistry);

      const rule = createRuleResponse({
        kind: 'signal',
        metadata: {
          builder_type: FIXTURE_TYPE_ID,
          builder_fields: { q: 'host.name: test', severity: 'high', risk_score: 10 },
        },
      });

      const error = await runCompileOnly(invalidPipeline, rule);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED);
    });
  });
});

/*
 * ─── Scout-level run assessment ──────────────────────────────────────────────
 *
 * Step 6.6 asks for a Scout run "if the harness allows registering a fixture
 * type". Result: not possible with the current harness without a separate
 * Kibana plugin.
 *
 * What was checked:
 * - The Scout harness under
 *   `alerting_v2/test/scout_alerting_v2/engine_executor/api/` boots a full
 *   Kibana + Elasticsearch stack and drives the executor through HTTP APIs.
 * - Builder types register server-side during a plugin's `setup()` phase
 *   via `AlertingServerSetup.registerBuilderType`. There is no HTTP API that
 *   exposes this registration surface at runtime.
 * - Registering a fixture type at Scout test time therefore requires a
 *   dedicated Kibana test plugin (its own `kibana.jsonc`, moon registration,
 *   CODEOWNERS, `setup()` that calls `registerBuilderType`). Creating such a
 *   plugin is its own engineering step, out of scope for 6.6.
 * - No existing Scout test plugin in the alerting_v2 tree was found that
 *   already exposes this hook.
 *
 * Why this does not block the phase:
 * - The unit-level tests above exercise the full compile → execute → enrich →
 *   store chain with mocked Elasticsearch, covering all four failure codes and
 *   the enriched-field assertions on the stored documents.
 * - Phase 8 creates the `security_detections` plugin and registers the real
 *   detection types via `registerBuilderType`. Once that plugin exists, the
 *   existing Scout executor suite gets a live execution-time type to run
 *   against — without any additional test-plugin machinery.
 */
