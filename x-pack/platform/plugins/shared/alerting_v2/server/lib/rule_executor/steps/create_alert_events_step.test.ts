/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { ByteSizeValue } from '@kbn/config-schema';
import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import { TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import type { RegisteredBuilderType } from '@kbn/alerting-v2-rule-builders';
import { CreateAlertEventsStep } from './create_alert_events_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRuleResponse,
  createRulePipelineState,
  getStepError,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import * as buildAlertEventsModule from '../build_alert_events';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../../errors/error_codes';
import { BuilderTypeRegistry } from '../../builder_types';
import { FoldedVersionsSet } from '../../builder_types/folded_versions';
import type { PluginConfig } from '../../../config';

// ---------------------------------------------------------------------------
// Registry fixtures
// ---------------------------------------------------------------------------

const simpleSchema = z.object({ severity: z.string().max(50) }).strict();

function makeEnrichmentDefinition(
  overrides: Partial<RegisteredBuilderType> = {}
): RegisteredBuilderType {
  return {
    type: 'test.enrichment',
    name: 'Test Enrichment Type',
    compilation: 'execution_time',
    builderFieldsSchema: simpleSchema as unknown as RegisteredBuilderType['builderFieldsSchema'],
    generateQuery: jest.fn(() => ({
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
    })),
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
// Step factory
// ---------------------------------------------------------------------------

describe('CreateAlertEventsStep', () => {
  let step: CreateAlertEventsStep;
  let mockLogger: jest.Mocked<Logger>;

  function createStep(
    rulesConfigOverrides?: Partial<PluginConfig['rules']>,
    registry?: BuilderTypeRegistry
  ) {
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
        ...rulesConfigOverrides,
      },
      esql: { responseFormat: 'json' },
    };

    const pluginConfigAccessor =
      coreMock.createPluginInitializerContext<PluginConfig>(config).config;

    const logger = createLoggerService();
    mockLogger = logger.mockLogger;

    return new CreateAlertEventsStep(
      logger.loggerService,
      pluginConfigAccessor,
      registry ?? makeRegistry()
    );
  }

  beforeEach(() => {
    step = createStep();
  });

  it('builds alert-typed events for kind: alert rule', async () => {
    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'alert' });
    const esqlRowBatch = [{ 'host.name': 'host-a' }, { 'host.name': 'host-b' }];

    const state = createRulePipelineState({ input, rule, esqlRowBatch });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');
    expect(result.state.alertEventsBatch).toHaveLength(2);

    expect(result.state.alertEventsBatch?.[0]).toEqual({
      '@timestamp': expect.any(String),
      scheduled_timestamp: input.scheduledAt,
      rule: { id: rule.id, version: 1 },
      group_hash: expect.any(String),
      data: { 'host.name': 'host-a' },
      status: 'breached',
      source: 'internal',
      type: 'alert',
      space_id: 'default',
    });

    expect(result.state.alertEventsBatch?.[1]).toEqual({
      '@timestamp': expect.any(String),
      scheduled_timestamp: input.scheduledAt,
      rule: { id: rule.id, version: 1 },
      group_hash: expect.any(String),
      data: { 'host.name': 'host-b' },
      status: 'breached',
      source: 'internal',
      type: 'alert',
      space_id: 'default',
    });
  });

  it('captures rule.version from the rule version', async () => {
    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ metadata: { version: 5 } });
    const esqlRowBatch = [{ 'host.name': 'host-a' }];

    const state = createRulePipelineState({ input, rule, esqlRowBatch });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));
    expect(result.state.alertEventsBatch?.[0].rule).toEqual({ id: rule.id, version: 5 });
  });

  it('builds signal-typed events for a stateless kind: signal rule', async () => {
    const input = createRuleExecutionInput();
    const rule = createRuleResponse({ kind: 'signal' });
    const esqlRowBatch = [{ 'host.name': 'host-a' }];

    const state = createRulePipelineState({ input, rule, esqlRowBatch });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');
    expect(result.state.alertEventsBatch).toHaveLength(1);
    expect(result.state.alertEventsBatch?.[0]).toMatchObject({
      type: 'signal',
      status: 'breached',
    });
  });

  it('yields multiple batches when receiving multiple input batches', async () => {
    const input = createRuleExecutionInput();
    const rule = createRuleResponse();
    const batch1 = [{ 'host.name': 'host-a' }];
    const batch2 = [{ 'host.name': 'host-b' }];

    const state1 = createRulePipelineState({ input, rule, esqlRowBatch: batch1 });
    const state2 = createRulePipelineState({ input, rule, esqlRowBatch: batch2 });

    const results = await collectStreamResults(
      step.executeStream(createPipelineStream([state1, state2]))
    );

    expect(results).toHaveLength(2);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.alertEventsBatch).toHaveLength(1);
    expect(results[1].type).toBe('continue');
    expect(results[1].state.alertEventsBatch).toHaveLength(1);
  });

  it('yields continue with empty alertEventsBatch when no alert events are produced', async () => {
    const input = createRuleExecutionInput();
    const rule = createRuleResponse();

    const state = createRulePipelineState({ input, rule, esqlRowBatch: [] });

    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.alertEventsBatch).toEqual([]);
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const state = createRulePipelineState({ esqlRowBatch: [{ 'host.name': 'host-a' }] });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });

  it('halts with state_not_ready when esqlRowBatch is missing from state', async () => {
    const state = createRulePipelineState({ rule: createRuleResponse() });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });

  describe('maxGroupsPerExecution', () => {
    it('drops new groups past the limit and logs a warning exactly once', async () => {
      step = createStep({
        run: {
          alerts: { max: 10000 },
          maxGroupsPerExecution: 2,
          query: { maxResponseSize: ByteSizeValue.parse('50mb') },
        },
      });

      const input = createRuleExecutionInput();
      const rule = createRuleResponse({ kind: 'alert', grouping: { fields: ['host.name'] } });
      const esqlRowBatch = [
        { 'host.name': 'host-a' },
        { 'host.name': 'host-b' },
        { 'host.name': 'host-c' },
        { 'host.name': 'host-d' },
      ];

      const state = createRulePipelineState({ input, rule, esqlRowBatch });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') throw new Error('expected a continue result');
      expect(result.state.alertEventsBatch).toHaveLength(2);
      // The dropped groups surface as a telemetry counter for this batch.
      expect(result.meta?.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.groupsDroppedByLimit]: 2,
      });
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('exceeded maxGroupsPerExecution=2'),
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.RULE_EXECUTION_MAX_GROUPS_EXCEEDED,
            rule_id: expect.any(String),
            space_id: expect.any(String),
          }),
        })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('dropped 2 new group(s) this run'),
        expect.anything()
      );
    });

    it('counts distinct dropped groups, not dropped rows, when a group spans multiple rows', async () => {
      step = createStep({
        run: {
          alerts: { max: 10000 },
          maxGroupsPerExecution: 1,
          query: { maxResponseSize: ByteSizeValue.parse('50mb') },
        },
      });

      const input = createRuleExecutionInput();
      const rule = createRuleResponse({ kind: 'alert', grouping: { fields: ['host.name'] } });
      const esqlRowBatch = [
        { 'host.name': 'host-a' },
        { 'host.name': 'host-b' },
        { 'host.name': 'host-b' },
        { 'host.name': 'host-b' },
      ];

      const state = createRulePipelineState({ input, rule, esqlRowBatch });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') throw new Error('expected a continue result');
      expect(result.state.alertEventsBatch).toHaveLength(1);
      expect(result.meta?.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.groupsDroppedByLimit]: 1,
      });
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('dropped 1 new group(s) this run'),
        expect.anything()
      );
    });

    it('does not warn when the number of groups stays within the limit', async () => {
      step = createStep({
        run: {
          alerts: { max: 10000 },
          maxGroupsPerExecution: 10,
          query: { maxResponseSize: ByteSizeValue.parse('50mb') },
        },
      });

      const input = createRuleExecutionInput();
      const rule = createRuleResponse({ kind: 'alert' });
      const esqlRowBatch = [{ 'host.name': 'host-a' }, { 'host.name': 'host-b' }];

      const state = createRulePipelineState({ input, rule, esqlRowBatch });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') throw new Error('expected a continue result');
      expect(result.state.alertEventsBatch).toHaveLength(2);
      // Nothing dropped -> the counter is emitted as zero for the batch.
      expect(result.meta?.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.groupsDroppedByLimit]: 0,
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('honors the limit across multiple batches and warns only once', async () => {
      step = createStep({
        run: {
          alerts: { max: 10000 },
          maxGroupsPerExecution: 2,
          query: { maxResponseSize: ByteSizeValue.parse('50mb') },
        },
      });

      const input = createRuleExecutionInput();
      const rule = createRuleResponse({ kind: 'alert', grouping: { fields: ['host.name'] } });
      const batch1 = [{ 'host.name': 'host-a' }, { 'host.name': 'host-b' }];
      const batch2 = [{ 'host.name': 'host-c' }, { 'host.name': 'host-d' }];

      const state1 = createRulePipelineState({ input, rule, esqlRowBatch: batch1 });
      const state2 = createRulePipelineState({ input, rule, esqlRowBatch: batch2 });

      const results = await collectStreamResults(
        step.executeStream(createPipelineStream([state1, state2]))
      );

      expect(results).toHaveLength(2);
      const [first, second] = results;
      if (first.type !== 'continue' || second.type !== 'continue') {
        throw new Error('expected continue results');
      }
      // First batch fills the cap; second batch is entirely new groups -> dropped.
      expect(first.state.alertEventsBatch).toHaveLength(2);
      expect(second.state.alertEventsBatch).toHaveLength(0);
      // The counter is per-batch; the collector sums it across the run.
      expect(first.meta?.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.groupsDroppedByLimit]: 0,
      });
      expect(second.meta?.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.groupsDroppedByLimit]: 2,
      });
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      // The tally accumulates across batches, not just the last one.
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('dropped 2 new group(s) this run'),
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.RULE_EXECUTION_MAX_GROUPS_EXCEEDED,
          }),
        })
      );
    });
  });

  describe('active group protection', () => {
    const hashFor = (host: string) =>
      buildAlertEventsModule.buildGroupHash({
        rowDoc: { 'host.name': host },
        groupKeyFields: ['host.name'],
        fallbackSeed: 'unused',
      });

    it('never drops an active group and preserves the active set on state for reuse', async () => {
      step = createStep({
        run: {
          alerts: { max: 10000 },
          maxGroupsPerExecution: 1,
          query: { maxResponseSize: ByteSizeValue.parse('50mb') },
        },
      });

      const input = createRuleExecutionInput();
      const rule = createRuleResponse({ kind: 'alert', grouping: { fields: ['host.name'] } });
      const esqlRowBatch = [
        { 'host.name': 'host-a' }, // new group -> fills the cap
        { 'host.name': 'host-b' }, // new group past the cap -> dropped
        { 'host.name': 'host-c' }, // active group -> kept despite the cap
      ];
      const activeGroups = [{ group_hash: hashFor('host-c') }];

      const state = createRulePipelineState({ input, rule, esqlRowBatch, activeGroups });
      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      if (result.type !== 'continue') throw new Error('expected a continue result');
      const keptHosts = (result.state.alertEventsBatch ?? []).map(
        (event) => (event.data as { 'host.name': string })['host.name']
      );
      expect(keptHosts).toEqual(['host-a', 'host-c']);
      expect(result.meta?.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.groupsDroppedByLimit]: 1,
      });
      expect(result.state.activeGroups).toEqual(activeGroups);
    });
  });

  describe('enrichRuleEvent hook', () => {
    // A rule with builder_type 'test.enrichment' and builder_fields { severity: 'high' }.
    // The simpleSchema accepts { severity: string } so parse succeeds.
    function makeEnrichedRule(hookOverrides: Partial<RegisteredBuilderType> = {}) {
      const definition = makeEnrichmentDefinition(hookOverrides);
      const registry = makeRegistry(definition);
      const localStep = createStep(undefined, registry);

      const rule = createRuleResponse({
        kind: 'signal',
        metadata: {
          builder_type: 'test.enrichment',
          builder_fields: { severity: 'high' },
          signature_id: 'sig-001',
        },
      });

      return { localStep, rule };
    }

    it('no-hook case: a type with no enrichRuleEvent hook leaves events unchanged', async () => {
      // Register a type that has no hook. The registry is consulted once, but
      // per-event cost is zero because enrichRuleEvent is absent.
      const definition = makeEnrichmentDefinition(); // no enrichRuleEvent
      const registry = makeRegistry(definition);
      step = createStep(undefined, registry);

      const rule = createRuleResponse({
        kind: 'signal',
        metadata: { builder_type: 'test.enrichment', builder_fields: { severity: 'high' } },
      });
      const esqlRowBatch = [{ 'host.name': 'host-a', severity: 'low' }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') throw new Error('expected continue');
      // Severity comes from the row column (unchanged path).
      expect(result.state.alertEventsBatch?.[0].severity).toBe('low');
      expect(result.state.alertEventsBatch?.[0].data).toEqual({
        'host.name': 'host-a',
        severity: 'low',
      });
    });

    it('precedence rule 1: hook severity wins over the row severity column', async () => {
      const { localStep, rule } = makeEnrichedRule({
        enrichRuleEvent: () => ({ severity: 'critical' }),
      });

      const esqlRowBatch = [{ 'host.name': 'host-a', severity: 'low' }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });

      const [result] = await collectStreamResults(
        localStep.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') throw new Error('expected continue');
      expect(result.state.alertEventsBatch?.[0].severity).toBe('critical');
    });

    it('precedence rule 1: row column severity applies when hook returns no severity', async () => {
      const { localStep, rule } = makeEnrichedRule({
        enrichRuleEvent: () => ({ data: { 'kibana.alert.risk_score': 75 } }),
      });

      const esqlRowBatch = [{ 'host.name': 'host-a', severity: 'high' }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });

      const [result] = await collectStreamResults(
        localStep.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') throw new Error('expected continue');
      expect(result.state.alertEventsBatch?.[0].severity).toBe('high');
    });

    it('precedence rule 2: hook data additions merge over the row', async () => {
      const { localStep, rule } = makeEnrichedRule({
        enrichRuleEvent: () => ({
          data: { 'kibana.alert.risk_score': 75, 'kibana.alert.rule.rule_id': 'sig-001' },
        }),
      });

      const esqlRowBatch = [{ 'host.name': 'host-a' }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });

      const [result] = await collectStreamResults(
        localStep.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') throw new Error('expected continue');
      expect(result.state.alertEventsBatch?.[0].data).toEqual({
        'host.name': 'host-a',
        'kibana.alert.risk_score': 75,
        'kibana.alert.rule.rule_id': 'sig-001',
      });
    });

    it('precedence rule 2: hook wins key collisions with the row', async () => {
      const { localStep, rule } = makeEnrichedRule({
        enrichRuleEvent: () => ({ data: { region: 'hook-region' } }),
      });

      const esqlRowBatch = [{ 'host.name': 'host-a', region: 'row-region' }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });

      const [result] = await collectStreamResults(
        localStep.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') throw new Error('expected continue');
      const data = result.state.alertEventsBatch?.[0].data as Record<string, unknown>;
      expect(data.region).toBe('hook-region');
    });

    it('throw case: a throwing hook fails the run as a user-source error', async () => {
      const { localStep, rule } = makeEnrichedRule({
        enrichRuleEvent: () => {
          throw new Error('enrichment failed');
        },
      });

      const esqlRowBatch = [{ 'host.name': 'host-a' }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });

      const error = await getStepError(localStep, state);

      expect(error).toBeDefined();
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      expect(error?.message).toContain('enrichment failed');
      // The wrapped Boom error carries the right error code in its `.data` field.
      expect((error as any).data?.code).toBe(ALERTING_ERROR_CODES.RULE_EVENT_ENRICHMENT_FAILED);
    });

    it('passes the rule identity to the hook input', async () => {
      const capturedInputs: Array<{ id: string; signature_id: string; kind: string }> = [];
      const { localStep, rule } = makeEnrichedRule({
        enrichRuleEvent: ({ rule: ruleId }) => {
          capturedInputs.push(ruleId);
          return {};
        },
      });

      const esqlRowBatch = [{ 'host.name': 'host-a' }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });
      await collectStreamResults(localStep.executeStream(createPipelineStream([state])));

      expect(capturedInputs).toHaveLength(1);
      expect(capturedInputs[0].id).toBe(rule.id);
      expect(capturedInputs[0].signature_id).toBe('sig-001');
      expect(capturedInputs[0].kind).toBe('signal');
    });

    it('passes the unmerged row to the hook', async () => {
      const capturedRows: Array<Readonly<Record<string, unknown>>> = [];
      const { localStep, rule } = makeEnrichedRule({
        enrichRuleEvent: ({ row }) => {
          capturedRows.push(row);
          return {};
        },
      });

      const esqlRowBatch = [{ 'host.name': 'host-a', score: 99 }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });
      await collectStreamResults(localStep.executeStream(createPipelineStream([state])));

      expect(capturedRows).toHaveLength(1);
      expect(capturedRows[0]).toEqual({ 'host.name': 'host-a', score: 99 });
    });

    it('hook is not called when the rule has no builder_type (plain ES|QL rule)', async () => {
      // A rule with no builder_type: no registry lookup happens, hook is never called.
      const hookSpy = jest.fn().mockReturnValue({});
      const definition = makeEnrichmentDefinition({ enrichRuleEvent: hookSpy });
      const registry = makeRegistry(definition);
      step = createStep(undefined, registry);

      // No builder_type on this rule
      const rule = createRuleResponse({ kind: 'signal' });
      const esqlRowBatch = [{ 'host.name': 'host-a' }];
      const state = createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch });

      await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(hookSpy).not.toHaveBeenCalled();
    });

    it('a framework fault in buildBatch (not the hook) propagates without RULE_EVENT_ENRICHMENT_FAILED', async () => {
      // The try/catch must be scoped to the hook call only. A throw from group
      // hashing, document building, or any other part of buildBatch must keep
      // its own error and default (framework) source classification, not be
      // mislabelled as a hook failure.
      //
      // We test this by intercepting createAlertEventsBatchBuilder to return a
      // builder whose buildBatch throws directly (simulating a framework fault
      // that has nothing to do with the enrichRuleEvent hook).
      //
      // Ref: rule-event-generation-logic.md "Failure handling"
      const { localStep, rule } = makeEnrichedRule({
        // Hook does not throw.
        enrichRuleEvent: () => ({ severity: 'critical' }),
      });

      const frameworkError = new TypeError('Framework error inside buildBatch');
      const spy = jest
        .spyOn(buildAlertEventsModule, 'createAlertEventsBatchBuilder')
        .mockReturnValueOnce({
          buildBatch: () => {
            throw frameworkError;
          },
          get droppedGroupCount() {
            return 0;
          },
        });

      try {
        const esqlRowBatch = [{ 'host.name': 'host-a' }];
        const state = createRulePipelineState({
          input: createRuleExecutionInput(),
          rule,
          esqlRowBatch,
        });

        const error = await getStepError(localStep, state);

        // An error must have occurred.
        expect(error).toBeDefined();
        // It must NOT carry RULE_EVENT_ENRICHMENT_FAILED — that code is for hook throws only.
        expect((error as any).data?.code).not.toBe(
          ALERTING_ERROR_CODES.RULE_EVENT_ENRICHMENT_FAILED
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('uses parsedBuilderFields from compile-step state instead of re-parsing builder_fields', async () => {
      // For execution-time rules, CompileRuleQueryStep already parses builder_fields
      // and threads the result as state.parsedBuilderFields. The step must pass those
      // to the hook without re-parsing. This avoids a double schema parse and, more
      // importantly, avoids adding a new failure mode for write-time rules whose
      // stored fields may have drifted from the current schema.
      //
      // Ref: RulePipelineState.parsedBuilderFields (types.ts)
      const capturedFields: unknown[] = [];
      const { localStep, rule } = makeEnrichedRule({
        enrichRuleEvent: ({ fields }) => {
          capturedFields.push(fields);
          return {};
        },
      });

      const esqlRowBatch = [{ 'host.name': 'host-a' }];
      // Inject parsedBuilderFields onto the state — simulating what CompileRuleQueryStep sets.
      const parsedBuilderFields = { severity: 'critical', _parsed: true };
      const state = {
        ...createRulePipelineState({ input: createRuleExecutionInput(), rule, esqlRowBatch }),
        parsedBuilderFields,
      };

      await collectStreamResults(localStep.executeStream(createPipelineStream([state])));

      // The hook must receive parsedBuilderFields, not rule.metadata.builder_fields.
      expect(capturedFields).toHaveLength(1);
      expect(capturedFields[0]).toBe(parsedBuilderFields);
    });
  });
});
