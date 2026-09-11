/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId } from '@kbn/core-spaces-common';

import { buildTaskRunEventFields, type TaskRunEventFieldsParams } from './task_run_fields';
import { RULE_EXECUTION_FAILURE_REASONS } from './failure_reason';
import { tagFailedStep } from './failed_step';
import { tagRunReport } from './run_report';
import { RuleExecutionCancellationError } from '../../execution_context';
import { createRulePipelineState } from '../test_utils';
import type { RuleExecutionPipelineResult } from '../execution_pipeline';
import type { RuleExecutionMetricsSnapshot } from '../metrics/types';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';

const input = { ruleId: 'rule-1', spaceId: asSpaceId('default') };

const createMetrics = (counters: Record<string, number> = {}): RuleExecutionMetricsSnapshot => ({
  executionId: 'execution-uuid',
  startedAt: '2025-01-01T00:00:00.000Z',
  endedAt: '2025-01-01T00:00:00.001Z',
  durationMs: 1,
  counters,
});

const createResult = (
  overrides: Partial<RuleExecutionPipelineResult> = {}
): RuleExecutionPipelineResult => ({
  completed: true,
  finalState: createRulePipelineState(),
  metrics: createMetrics(),
  ...overrides,
});

const zeroedMetricFields = {
  'metrics.signalsGenerated': 0,
  'metrics.ruleEventsGenerated': 0,
  'metrics.newEpisodesGenerated': 0,
  'metrics.rowsReturnedByQuery': 0,
  'metrics.groupsDroppedByLimit': 0,
  'metrics.rowsDroppedByLimit': 0,
};

describe('buildTaskRunEventFields', () => {
  describe('rule identity', () => {
    it('reports the rule and space alongside the outcome', () => {
      expect(buildTaskRunEventFields({ input, result: createResult() })).toEqual({
        status: 'success',
        'rule.id': 'rule-1',
        'rule.spaceId': 'default',
        ...zeroedMetricFields,
      });
    });

    it('reports the rule version once final state carries it', () => {
      const finalState = createRulePipelineState({
        // @ts-expect-error: only the version is read
        rule: { metadata: { version: 7 } },
      });

      expect(buildTaskRunEventFields({ input, result: createResult({ finalState }) })).toEqual(
        expect.objectContaining({ 'rule.version': 7 })
      );
    });

    it('omits the optional fields rather than writing them as undefined', () => {
      const fields = buildTaskRunEventFields({ input, result: createResult() });

      expect(fields).not.toHaveProperty('reason');
      expect(fields).not.toHaveProperty(['rule.version']);
    });
  });

  describe('metrics', () => {
    it('mirrors the counter catalog verbatim, under a metrics prefix', () => {
      const result = createResult({
        metrics: createMetrics({
          [RULE_EXECUTION_COUNTERS.signalsGenerated]: 4,
          [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: 120,
        }),
      });

      expect(buildTaskRunEventFields({ input, result })).toEqual(
        expect.objectContaining({
          'metrics.signalsGenerated': 4,
          'metrics.rowsReturnedByQuery': 120,
        })
      );
    });

    it('reports every catalog counter, defaulting the unrecorded ones to zero', () => {
      const fields = buildTaskRunEventFields({ input, result: createResult() });

      expect(fields).toEqual(expect.objectContaining(zeroedMetricFields));
    });

    it('surfaces a new catalog counter without touching the payload writer', () => {
      const fields = buildTaskRunEventFields({ input, result: createResult() });

      for (const counter of Object.values(RULE_EXECUTION_COUNTERS)) {
        expect(fields).toHaveProperty([`metrics.${counter}`]);
      }
    });

    it('does not report counters recorded outside the catalog', () => {
      const result = createResult({ metrics: createMetrics({ somethingAdHoc: 9 }) });

      expect(buildTaskRunEventFields({ input, result })).not.toHaveProperty([
        'metrics.somethingAdHoc',
      ]);
    });

    it('reports metrics for a run that threw, from the report on the error', () => {
      const error = tagRunReport(new Error('boom'), {
        counters: { [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: 30 },
      });

      expect(buildTaskRunEventFields({ input, error })).toEqual(
        expect.objectContaining({
          ...zeroedMetricFields,
          'metrics.rowsReturnedByQuery': 30,
        })
      );
    });

    it('reports the rule version a throwing run had reached', () => {
      const error = tagRunReport(new Error('boom'), { ruleVersion: 4, counters: {} });

      expect(buildTaskRunEventFields({ input, error })).toEqual(
        expect.objectContaining({ 'rule.version': 4 })
      );
    });

    it('reports no metrics when a throwing run carries no report', () => {
      const fields = buildTaskRunEventFields({ input, error: new Error('boom') });

      expect(Object.keys(fields).some((key) => key.startsWith('metrics.'))).toBe(false);
      expect(fields).not.toHaveProperty(['rule.version']);
    });
  });

  describe('from a result', () => {
    it('reports a completed run as a success', () => {
      expect(buildTaskRunEventFields({ input, result: createResult() })).toEqual(
        expect.objectContaining({ status: 'success' })
      );
    });

    it('downgrades a completed run to a warning when work was dropped', () => {
      const result = createResult({
        metrics: createMetrics({ [RULE_EXECUTION_COUNTERS.rowsDroppedByLimit]: 1 }),
      });

      expect(buildTaskRunEventFields({ input, result })).toEqual(
        expect.objectContaining({ status: 'warning' })
      );
    });

    it('reports a halt as skipped and passes the halt reason through', () => {
      const result = createResult({ completed: false, haltReason: 'rule_disabled' });

      expect(buildTaskRunEventFields({ input, result })).toEqual(
        expect.objectContaining({ status: 'skipped', reason: 'rule_disabled' })
      );
    });
  });

  describe('from an error', () => {
    it('reports a failure and names the step that threw', () => {
      const error = tagFailedStep(new Error('boom'), 'execute_rule_query');

      expect(buildTaskRunEventFields({ input, error })).toEqual(
        expect.objectContaining({ status: 'failed', reason: 'execute_rule_query' })
      );
    });

    it('reports a timeout for a cancellation, whatever step was in flight', () => {
      const error = tagFailedStep(new RuleExecutionCancellationError(), 'director');

      expect(buildTaskRunEventFields({ input, error })).toEqual(
        expect.objectContaining({
          status: 'timeout',
          reason: RULE_EXECUTION_FAILURE_REASONS.CANCELLED_TIMEOUT,
        })
      );
    });

    it('omits the reason when the error carries no tag', () => {
      expect(buildTaskRunEventFields({ input, error: new Error('boom') })).not.toHaveProperty(
        'reason'
      );
    });

    it('treats a thrown undefined as a failure rather than a missing argument', () => {
      expect(buildTaskRunEventFields({ input, error: undefined })).toEqual(
        expect.objectContaining({ status: 'failed' })
      );
    });
  });

  it('throws when given neither a result nor an error', () => {
    expect(() => buildTaskRunEventFields({ input } as TaskRunEventFieldsParams)).toThrow(
      'requires either a result or an error'
    );
  });
});
