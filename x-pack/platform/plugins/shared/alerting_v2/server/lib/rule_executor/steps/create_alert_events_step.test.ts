/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import { CreateAlertEventsStep } from './create_alert_events_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRuleResponse,
  createRulePipelineState,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { buildGroupHash } from '../build_alert_events';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { PluginConfig } from '../../../config';

describe('CreateAlertEventsStep', () => {
  let step: CreateAlertEventsStep;
  let mockLogger: jest.Mocked<Logger>;

  function createStep(rulesConfigOverrides?: Partial<PluginConfig['rules']>) {
    const config: PluginConfig = {
      enabled: true,
      invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
      rules: {
        minimumScheduleInterval: '1m',
        maxScheduledPerMinute: 400,
        run: {
          alerts: { max: 10000 },
          maxGroupsPerExecution: 10000,
          query: { maxResponseSize: 50 * 1024 * 1024 },
        },
        ...rulesConfigOverrides,
      },
      esql: { responseFormat: 'json' },
    };

    const pluginConfigAccessor =
      coreMock.createPluginInitializerContext<PluginConfig>(config).config;

    const logger = createLoggerService();
    mockLogger = logger.mockLogger;

    return new CreateAlertEventsStep(logger.loggerService, pluginConfigAccessor);
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
          query: { maxResponseSize: 50 * 1024 * 1024 },
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
          query: { maxResponseSize: 50 * 1024 * 1024 },
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
          query: { maxResponseSize: 50 * 1024 * 1024 },
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
          query: { maxResponseSize: 50 * 1024 * 1024 },
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
      buildGroupHash({
        rowDoc: { 'host.name': host },
        groupKeyFields: ['host.name'],
        fallbackSeed: 'unused',
      });

    it('never drops an active group and preserves the active set on state for reuse', async () => {
      step = createStep({
        run: {
          alerts: { max: 10000 },
          maxGroupsPerExecution: 1,
          query: { maxResponseSize: 50 * 1024 * 1024 },
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
});
