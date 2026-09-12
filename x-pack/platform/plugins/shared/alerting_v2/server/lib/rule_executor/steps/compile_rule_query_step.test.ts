/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { BuilderQueryGenerationError } from '@kbn/alerting-v2-rule-builders';
import type { GeneratedQuery, RegisteredBuilderType } from '@kbn/alerting-v2-rule-builders';
import { BuilderTypeRegistry } from '../../builder_types';
import { FoldedVersionsSet } from '../../builder_types/folded_versions';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { CompileRuleQueryStep } from './compile_rule_query_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleResponse,
  createRulePipelineState,
  getStepError,
} from '../test_utils';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXED_NOW_MS = new Date('2025-06-01T12:00:00.000Z').getTime();
const FIXED_NOW_ISO = new Date(FIXED_NOW_MS).toISOString();

const simpleSchema = z.object({ q: z.string().max(100) }).strict();

const standaloneBreach = (esql: string): GeneratedQuery => ({
  query: { format: 'standalone', breach: { query: esql } },
});

const COMPILED_QUERY_TEXT = 'FROM logs-* | WHERE KQL("host.name: test") | LIMIT 10';

function makeExecutionTypeDefinition(
  overrides: Partial<RegisteredBuilderType> = {}
): RegisteredBuilderType {
  return {
    type: 'test.exec',
    name: 'Test Execution-Time Type',
    compilation: 'execution_time',
    builderFieldsSchema: simpleSchema as unknown as RegisteredBuilderType['builderFieldsSchema'],
    generateQuery: jest.fn(() => standaloneBreach(COMPILED_QUERY_TEXT)),
    ...overrides,
  };
}

function makeWriteTimeDefinition(
  overrides: Partial<RegisteredBuilderType> = {}
): RegisteredBuilderType {
  return {
    type: 'test.write',
    name: 'Test Write-Time Type',
    // compilation defaults to write_time
    builderFieldsSchema: simpleSchema as unknown as RegisteredBuilderType['builderFieldsSchema'],
    generateQuery: jest.fn(() => standaloneBreach('FROM logs-* | LIMIT 5')),
    ...overrides,
  };
}

function makeRegistry(...definitions: RegisteredBuilderType[]): BuilderTypeRegistry {
  const registry = new BuilderTypeRegistry().withFoldedVersions(new FoldedVersionsSet());
  for (const def of definitions) {
    registry.register(def);
  }
  return registry;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CompileRuleQueryStep', () => {
  let step: CompileRuleQueryStep;
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW_MS);
    registry = makeRegistry();
    step = new CompileRuleQueryStep(registry);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── pass-through: plain rule ───────────────────────────────────────────

  describe('stored-query pass-through', () => {
    it('sets effectiveQuery = rule.query for a plain ES|QL rule (no builder_type)', async () => {
      const rule = createRuleResponse({ schedule: { every: '5m', lookback: '15m' } });
      const state = createRulePipelineState({ rule });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type === 'continue') {
        expect(result.state.effectiveQuery).toEqual(rule.query);
      }
    });

    it('sets effectiveQuery = rule.query for a write-time builder rule', async () => {
      registry = makeRegistry(makeWriteTimeDefinition());
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        schedule: { every: '1m' },
        metadata: { builder_type: 'test.write', builder_fields: { q: 'hello' } },
      });
      const state = createRulePipelineState({ rule });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type === 'continue') {
        expect(result.state.effectiveQuery).toEqual(rule.query);
      }
    });
  });

  // ─── execution-time compilation ──────────────────────────────────────────

  describe('execution-time compilation', () => {
    beforeEach(() => {
      registry = makeRegistry(makeExecutionTypeDefinition());
      step = new CompileRuleQueryStep(registry);
    });

    it('calls generateQuery with the compilation context and sets effectiveQuery', async () => {
      const rule = createRuleResponse({
        kind: 'signal',
        schedule: { every: '5m', lookback: '10m' },
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'test' } },
      });
      const state = createRulePipelineState({ rule });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type === 'continue') {
        expect(result.state.effectiveQuery).toEqual(standaloneBreach(COMPILED_QUERY_TEXT).query);
      }
    });

    it('passes parsed fields, rule context, and run context to generateQuery', async () => {
      const definition = makeExecutionTypeDefinition();
      registry = makeRegistry(definition);
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        kind: 'signal',
        schedule: { every: '5m', lookback: '10m' },
        time_field: '@timestamp',
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'hello' } },
      });
      const state = createRulePipelineState({ rule });
      await collectStreamResults(step.executeStream(createPipelineStream([state])));

      const expectedStart = new Date(FIXED_NOW_MS - 10 * 60 * 1000).toISOString();
      expect(definition.generateQuery).toHaveBeenCalledWith({
        fields: { q: 'hello' },
        rule: {
          id: rule.id,
          kind: rule.kind,
          schedule: rule.schedule,
          time_field: rule.time_field,
        },
        run: { now: FIXED_NOW_ISO, window: { start: expectedStart, end: FIXED_NOW_ISO } },
      });
    });

    it('awaits a promise-returning generateQuery', async () => {
      const asyncDefinition = makeExecutionTypeDefinition({
        generateQuery: jest.fn(async () => standaloneBreach(COMPILED_QUERY_TEXT)),
      });
      registry = makeRegistry(asyncDefinition);
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        kind: 'signal',
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'async' } },
      });
      const state = createRulePipelineState({ rule });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type === 'continue') {
        expect(result.state.effectiveQuery).toEqual(standaloneBreach(COMPILED_QUERY_TEXT).query);
      }
    });
  });

  // ─── time window ─────────────────────────────────────────────────────────

  describe('execution window', () => {
    it('uses lookback when present: start = now - lookback, end = now', async () => {
      const rule = createRuleResponse({ schedule: { every: '5m', lookback: '15m' } });
      const state = createRulePipelineState({ rule });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type === 'continue') {
        const expectedStart = new Date(FIXED_NOW_MS - 15 * 60 * 1000).toISOString();
        expect(result.state.executionWindow).toEqual({
          start: expectedStart,
          end: FIXED_NOW_ISO,
        });
      }
    });

    it('falls back to every when lookback is absent: start = now - every', async () => {
      const rule = createRuleResponse({ schedule: { every: '10m' } });
      // schedule has no lookback property — only every
      const state = createRulePipelineState({ rule });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type === 'continue') {
        const expectedStart = new Date(FIXED_NOW_MS - 10 * 60 * 1000).toISOString();
        expect(result.state.executionWindow).toEqual({
          start: expectedStart,
          end: FIXED_NOW_ISO,
        });
      }
    });

    it('resolves now once for both window members', async () => {
      const rule = createRuleResponse({ schedule: { every: '1m', lookback: '5m' } });
      const state = createRulePipelineState({ rule });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type === 'continue') {
        // Both ends must be derived from the same fixed instant
        expect(result.state.executionWindow?.end).toBe(FIXED_NOW_ISO);
        const expectedStart = new Date(FIXED_NOW_MS - 5 * 60 * 1000).toISOString();
        expect(result.state.executionWindow?.start).toBe(expectedStart);
      }
    });
  });

  // ─── failure: UNKNOWN_BUILDER_TYPE ───────────────────────────────────────

  describe('UNKNOWN_BUILDER_TYPE', () => {
    it('fails the run when the builder type is not in the registry', async () => {
      // registry is empty — no types registered
      const rule = createRuleResponse({
        metadata: { builder_type: 'test.missing', builder_fields: { q: 'x' } },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.UNKNOWN_BUILDER_TYPE);
    });
  });

  // ─── failure: INVALID_RULE_QUERY_CONFIG ──────────────────────────────────

  describe('INVALID_RULE_QUERY_CONFIG', () => {
    it('fails the run as a user-source error when a plain rule has no stored query', async () => {
      // A plain ES|QL rule (no builder_type) with no query is misconfigured — it
      // has no mechanism to produce one, so the run must fail loudly rather than
      // silently halt with state_not_ready.
      const rule = createRuleResponse({ query: undefined });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.INVALID_RULE_QUERY_CONFIG);
    });

    it('fails the run as a user-source error when a write-time builder rule has no stored query', async () => {
      // A write-time builder rule is supposed to have its query stored at save time.
      // If it is missing, the run must fail loudly rather than silently halt.
      registry = makeRegistry(makeWriteTimeDefinition());
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        query: undefined,
        metadata: { builder_type: 'test.write', builder_fields: { q: 'hello' } },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.INVALID_RULE_QUERY_CONFIG);
    });
  });

  // ─── failure: INVALID_BUILDER_FIELDS ─────────────────────────────────────

  describe('INVALID_BUILDER_FIELDS', () => {
    beforeEach(() => {
      registry = makeRegistry(makeExecutionTypeDefinition());
      step = new CompileRuleQueryStep(registry);
    });

    it('fails the run when builder_fields do not parse against the type schema', async () => {
      const rule = createRuleResponse({
        metadata: {
          builder_type: 'test.exec',
          // wrong shape: `q` must be a string, not a number
          builder_fields: { q: 42 },
        },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS);
    });

    it('fails the run when builder_fields are null (missing for an execution-time type)', async () => {
      const rule = createRuleResponse({
        metadata: {
          builder_type: 'test.exec',
          builder_fields: undefined,
        },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS);
    });
  });

  // ─── failure: BUILDER_QUERY_GENERATION_FAILED (throwing generator) ────────

  describe('BUILDER_QUERY_GENERATION_FAILED — throwing generateQuery', () => {
    it('fails the run when generateQuery throws a plain Error', async () => {
      const definition = makeExecutionTypeDefinition({
        generateQuery: jest.fn(() => {
          throw new Error('boom');
        }),
      });
      registry = makeRegistry(definition);
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'x' } },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(
        ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED
      );
    });

    it('fails the run when generateQuery throws a BuilderQueryGenerationError', async () => {
      const definition = makeExecutionTypeDefinition({
        generateQuery: jest.fn(() => {
          throw new BuilderQueryGenerationError('bad field value', 'q');
        }),
      });
      registry = makeRegistry(definition);
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'x' } },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(
        ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED
      );
    });

    it('fails the run when generateQuery (async) rejects', async () => {
      const definition = makeExecutionTypeDefinition({
        generateQuery: jest.fn(async () => {
          throw new Error('async boom');
        }),
      });
      registry = makeRegistry(definition);
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'x' } },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(
        ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED
      );
    });
  });

  // ─── failure: BUILDER_QUERY_GENERATION_FAILED (invalid/override result) ──

  describe('BUILDER_QUERY_GENERATION_FAILED — invalid compile result', () => {
    it('fails the run when the result carries a time_field override', async () => {
      const definition = makeExecutionTypeDefinition({
        generateQuery: jest.fn(() => ({
          ...standaloneBreach(COMPILED_QUERY_TEXT),
          time_field: 'event.created', // forbidden at execution time
        })),
      });
      registry = makeRegistry(definition);
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'x' } },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(
        ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED
      );
    });

    it('fails the run when the result carries a grouping override', async () => {
      const definition = makeExecutionTypeDefinition({
        generateQuery: jest.fn(() => ({
          ...standaloneBreach(COMPILED_QUERY_TEXT),
          grouping: { fields: ['host.name'] }, // forbidden at execution time
        })),
      });
      registry = makeRegistry(definition);
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'x' } },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(
        ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED
      );
    });

    it('fails the run when a signal rule returns a composed query with recovery', async () => {
      // Composed format: base is a full ES|QL string; breach/recovery are appended segments.
      const definition = makeExecutionTypeDefinition({
        generateQuery: jest.fn(() => ({
          query: {
            format: 'composed' as const,
            base: 'FROM logs-* | LIMIT 10',
            recovery: { segment: '| WHERE false' }, // invalid for signal: signals cannot have recovery
          },
        })),
      });
      registry = makeRegistry(definition);
      step = new CompileRuleQueryStep(registry);

      const rule = createRuleResponse({
        kind: 'signal',
        metadata: { builder_type: 'test.exec', builder_fields: { q: 'x' } },
      });
      const state = createRulePipelineState({ rule });

      const error = await getStepError(step, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect((error as any).data?.code).toBe(
        ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED
      );
    });
  });

  // ─── state_not_ready guard ────────────────────────────────────────────────

  it('halts with state_not_ready when rule is missing from state', async () => {
    const state = createRulePipelineState(); // no rule
    const [result] = await collectStreamResults(
      step.executeStream(createPipelineStream([state]))
    );

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });
});
