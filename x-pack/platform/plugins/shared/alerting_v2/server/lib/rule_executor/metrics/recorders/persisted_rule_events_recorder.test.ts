/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertEvent, createRulePipelineState } from '../../test_utils';
import type { AlertEvent } from '../../../../resources/datastreams/alert_events';
import { MetricCollectorImpl } from '../metric_collector';
import { PersistedRuleEventsRecorder } from './persisted_rule_events_recorder';
import type { MetricRecorderContext } from '../types';
import type { BulkIndexObservationError } from '../../types';

describe('PersistedRuleEventsRecorder', () => {
  const startedAt = new Date('2025-01-01T00:00:00.000Z');
  let collector: MetricCollectorImpl;
  let recorder: PersistedRuleEventsRecorder;

  const buildContext = (overrides: Partial<MetricRecorderContext> = {}): MetricRecorderContext => ({
    state: createRulePipelineState(),
    stepName: 'store_alert_events',
    emissionIndex: 0,
    ...overrides,
  });

  const rejection = (document: Record<string, unknown>): BulkIndexObservationError => ({
    code: 'mapper_parsing_exception',
    message: 'failed to parse',
    details: { statusCode: 400 },
    index: '.rule-events',
    document,
  });

  const episodeEvent = (episodeId: string): AlertEvent =>
    createAlertEvent({ type: 'alert', episode: { id: episodeId, status: 'active' } });

  beforeEach(() => {
    collector = new MetricCollectorImpl({ executionId: 'e', startedAt });
    recorder = new PersistedRuleEventsRecorder();
  });

  it('observes only the store_alert_events step and is named persisted_rule_events', () => {
    expect(recorder.name).toBe('persisted_rule_events');
    expect(recorder.observes).toEqual({ stepName: 'store_alert_events' });
  });

  it('no-ops when the bulk-index observation is absent', () => {
    recorder.record(collector, buildContext());
    expect(collector.snapshot().counters).toEqual({});
  });

  it('no-ops when nothing was persisted (empty docs)', () => {
    const failed = createAlertEvent({ type: 'signal' });
    recorder.record(
      collector,
      buildContext({
        meta: {
          observations: {
            bulkIndexResult: {
              attempted: 1,
              docs: [],
              errors: [rejection(failed)],
            },
          },
        },
      })
    );

    expect(collector.snapshot().counters).toEqual({});
  });

  it('increments ruleEventsGenerated and signalsGenerated when a signal-typed batch fully persists', () => {
    const persisted = [
      createAlertEvent({ type: 'signal' }),
      createAlertEvent({ type: 'signal' }),
      createAlertEvent({ type: 'signal' }),
    ];

    recorder.record(
      collector,
      buildContext({
        meta: {
          observations: {
            bulkIndexResult: { attempted: 3, docs: persisted, errors: [] },
          },
        },
      })
    );

    expect(collector.snapshot().counters).toEqual({
      ruleEventsGenerated: 3,
      signalsGenerated: 3,
    });
  });

  it('increments ruleEventsGenerated but not signalsGenerated for an alert-typed batch', () => {
    const persisted = [createAlertEvent({ type: 'alert' }), createAlertEvent({ type: 'alert' })];

    recorder.record(
      collector,
      buildContext({
        meta: {
          observations: {
            bulkIndexResult: { attempted: 2, docs: persisted, errors: [] },
          },
        },
      })
    );

    expect(collector.snapshot().counters).toEqual({
      ruleEventsGenerated: 2,
    });
  });

  it('counts only signal-typed docs in a mixed-type batch, ignoring what failed', () => {
    const persistedSignal1 = createAlertEvent({ type: 'signal' });
    const persistedAlert1 = createAlertEvent({ type: 'alert' });
    const failedSignal = createAlertEvent({ type: 'signal' });
    const persistedAlert2 = createAlertEvent({ type: 'alert' });

    recorder.record(
      collector,
      buildContext({
        meta: {
          observations: {
            bulkIndexResult: {
              attempted: 4,
              docs: [persistedSignal1, persistedAlert1, persistedAlert2],
              errors: [rejection(failedSignal)],
            },
          },
        },
      })
    );

    expect(collector.snapshot().counters).toEqual({
      ruleEventsGenerated: 3,
      signalsGenerated: 1,
    });
  });

  it('counts signals only from persisted docs when the batch is partially rejected', () => {
    const persistedA = createAlertEvent({ type: 'signal' });
    const failed = createAlertEvent({ type: 'signal' });
    const persistedB = createAlertEvent({ type: 'signal' });

    recorder.record(
      collector,
      buildContext({
        meta: {
          observations: {
            bulkIndexResult: {
              attempted: 3,
              docs: [persistedA, persistedB],
              errors: [rejection(failed)],
            },
          },
        },
      })
    );

    expect(collector.snapshot().counters).toEqual({
      ruleEventsGenerated: 2,
      signalsGenerated: 2,
    });
  });

  it('counts newEpisodesGenerated only for persisted docs whose episode was freshly opened', () => {
    const newA = episodeEvent('ep-new-1');
    const existing = episodeEvent('ep-existing');
    const newB = episodeEvent('ep-new-2');

    recorder.record(
      collector,
      buildContext({
        state: createRulePipelineState({ newEpisodeIds: ['ep-new-1', 'ep-new-2'] }),
        meta: {
          observations: {
            bulkIndexResult: { attempted: 3, docs: [newA, existing, newB], errors: [] },
          },
        },
      })
    );

    expect(collector.snapshot().counters).toEqual({
      ruleEventsGenerated: 3,
      newEpisodesGenerated: 2,
    });
  });

  it('does not count a new episode whose rule event failed to persist', () => {
    const persistedNew = episodeEvent('ep-new-1');
    const failedNew = episodeEvent('ep-new-2');

    recorder.record(
      collector,
      buildContext({
        state: createRulePipelineState({ newEpisodeIds: ['ep-new-1', 'ep-new-2'] }),
        meta: {
          observations: {
            bulkIndexResult: {
              attempted: 2,
              docs: [persistedNew],
              errors: [rejection(failedNew)],
            },
          },
        },
      })
    );

    expect(collector.snapshot().counters).toEqual({
      ruleEventsGenerated: 1,
      newEpisodesGenerated: 1,
    });
  });

  it('does not count new episodes when state carries none (e.g. a signal rule)', () => {
    const persisted = [createAlertEvent({ type: 'signal' })];

    recorder.record(
      collector,
      buildContext({
        state: createRulePipelineState(),
        meta: {
          observations: {
            bulkIndexResult: { attempted: 1, docs: persisted, errors: [] },
          },
        },
      })
    );

    expect(collector.snapshot().counters).toEqual({
      ruleEventsGenerated: 1,
      signalsGenerated: 1,
    });
  });

  it('sums repeated emissions across batches into the collector', () => {
    const signalBatch = [
      createAlertEvent({ type: 'signal' }),
      createAlertEvent({ type: 'signal' }),
    ];

    for (let i = 0; i < 3; i++) {
      recorder.record(
        collector,
        buildContext({
          meta: {
            observations: {
              bulkIndexResult: { attempted: 2, docs: signalBatch, errors: [] },
            },
          },
          emissionIndex: i,
        })
      );
    }

    expect(collector.snapshot().counters).toEqual({
      ruleEventsGenerated: 6,
      signalsGenerated: 6,
    });
  });
});
