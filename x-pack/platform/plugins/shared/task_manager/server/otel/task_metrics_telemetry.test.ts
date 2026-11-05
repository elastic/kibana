/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, metrics } from '@opentelemetry/api';
import { metrics as sdkMetrics } from '@elastic/opentelemetry-node/sdk';
import { BACKPRESSURE_REASONS } from '../lib/backpressure_reason';
import type { taskManagerMetricsTelemetry as TelemetryInstance } from './task_metrics_telemetry';

class TestMetricReader extends sdkMetrics.MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}

describe('taskManagerMetricsTelemetry', () => {
  let reader: TestMetricReader;
  let provider: InstanceType<typeof sdkMetrics.MeterProvider>;
  let telemetry: typeof TelemetryInstance;

  const collect = async () => {
    const { resourceMetrics } = await reader.collect();
    const scope = resourceMetrics.scopeMetrics.find(
      ({ scope: { name } }) => name === 'kibana.task_manager'
    );
    return new Map(
      (scope?.metrics ?? []).map(({ descriptor, dataPoints }) => [descriptor.name, dataPoints])
    );
  };

  beforeEach(() => {
    metrics.disable();
    reader = new TestMetricReader();
    provider = new sdkMetrics.MeterProvider({ readers: [reader] });
    metrics.setGlobalMeterProvider(provider);
    // the instruments are created when the module loads, so load it after the provider is set
    jest.isolateModules(() => {
      ({ taskManagerMetricsTelemetry: telemetry } = jest.requireActual('./task_metrics_telemetry'));
    });
  });

  afterEach(async () => {
    metrics.disable();
    await provider.shutdown();
    jest.restoreAllMocks();
  });

  test('records task runs by task type, group, status and error type', async () => {
    telemetry.recordTaskRun({
      taskType: 'alerting:.index-threshold',
      taskTypeGroup: 'alerting',
      success: true,
      timedOut: false,
      rescheduledFailure: false,
    });
    telemetry.recordTaskRun({
      taskType: 'report',
      taskTypeGroup: 'reporting',
      success: false,
      errorType: 'framework',
      timedOut: true,
      rescheduledFailure: true,
    });

    const collected = await collect();
    expect(collected.get('kibana.task.execution.count')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attributes: {
            task_type: 'alerting:.index-threshold',
            task_type_group: 'alerting',
            'kibana.task.status': 'success',
          },
          value: 1,
        }),
        expect.objectContaining({
          attributes: {
            task_type: 'report',
            'kibana.task.status': 'error',
            'error.type': 'framework',
          },
          value: 1,
        }),
      ])
    );
    expect(collected.get('kibana.task.execution.timeout.count')).toEqual([
      expect.objectContaining({ attributes: { task_type: 'report' }, value: 1 }),
    ]);
    expect(collected.get('kibana.task.execution.rescheduled_failure.count')).toEqual([
      expect.objectContaining({ attributes: { task_type: 'report' }, value: 1 }),
    ]);
  });

  test('records run delay overall, without task type attributes', async () => {
    telemetry.recordTaskRunDelay(12);
    telemetry.recordTaskRunDelay(3);

    const collected = await collect();
    expect(collected.get('kibana.task.execution.delay')).toEqual([
      expect.objectContaining({
        attributes: {},
        value: expect.objectContaining({ count: 2, sum: 15 }),
      }),
    ]);
  });

  test('records claims, claim duration in seconds and the time since the last claim', async () => {
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    telemetry.recordTaskClaim({ success: true, durationMs: 1500 });
    telemetry.recordTaskClaim({ success: false });

    dateNowSpy.mockReturnValue(1_700_000_042_500);
    const collected = await collect();
    expect(collected.get('kibana.task_manager.claim.count')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attributes: { 'kibana.task_manager.claim.status': 'success' },
          value: 1,
        }),
        expect.objectContaining({
          attributes: { 'kibana.task_manager.claim.status': 'error' },
          value: 1,
        }),
      ])
    );
    expect(collected.get('kibana.task_manager.claim.duration')).toEqual([
      expect.objectContaining({
        attributes: {},
        value: expect.objectContaining({
          count: 1,
          sum: 1.5,
          buckets: expect.objectContaining({
            boundaries: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 1.8, 2.5, 5, 10, 30],
          }),
        }),
      }),
    ]);
    expect(collected.get('kibana.task_manager.claim.age')).toEqual([
      expect.objectContaining({ attributes: {}, value: 42.5 }),
    ]);
  });

  test('does not report the claim age before the first claim', async () => {
    const collected = await collect();
    expect(collected.get('kibana.task_manager.claim.age') ?? []).toEqual([]);
  });

  test('reports backpressure as active and as one current reason among all reasons', async () => {
    const reasonValues = (points: Array<{ attributes: Attributes; value: unknown }> = []) =>
      Object.fromEntries(
        points.map(({ attributes, value }) => [
          attributes['kibana.task_manager.backpressure.reason'],
          value,
        ])
      );

    telemetry.recordTaskBackpressure({ active: true, reason: 'too_many_requests' });
    let collected = await collect();
    expect(collected.get('kibana.task_manager.backpressure.active')).toEqual([
      expect.objectContaining({ attributes: {}, value: 1 }),
    ]);
    expect(reasonValues(collected.get('kibana.task_manager.backpressure.reason'))).toEqual(
      Object.fromEntries(
        BACKPRESSURE_REASONS.map((reason) => [reason, reason === 'too_many_requests' ? 1 : 0])
      )
    );

    telemetry.recordTaskBackpressure({ active: false, reason: null });
    collected = await collect();
    expect(collected.get('kibana.task_manager.backpressure.active')).toEqual([
      expect.objectContaining({ attributes: {}, value: 0 }),
    ]);
    expect(reasonValues(collected.get('kibana.task_manager.backpressure.reason'))).toEqual(
      Object.fromEntries(BACKPRESSURE_REASONS.map((reason) => [reason, 0]))
    );
  });

  test('does not report the overdue count before overdue tasks are first counted', async () => {
    const collected = await collect();
    expect(collected.get('kibana.task.overdue.count') ?? []).toEqual([]);
  });

  test('reports overdue tasks overall from the total, ignoring per-type buckets', async () => {
    telemetry.recordTaskOverdue({
      'actions:.email': [
        { key: 0, doc_count: 2 },
        { key: 20, doc_count: 1 },
      ],
      report: [{ key: 10, doc_count: 1 }],
      total: [
        { key: 0, doc_count: 2 },
        { key: 10, doc_count: 1 },
        { key: 20, doc_count: 1 },
      ],
    });

    let collected = await collect();
    expect(collected.get('kibana.task.overdue.count')).toEqual([
      expect.objectContaining({ attributes: {}, value: 4 }),
    ]);
    expect(collected.get('kibana.task.overdue.delay')).toEqual([
      expect.objectContaining({
        attributes: {},
        value: expect.objectContaining({ count: 4, sum: 30 }),
      }),
    ]);

    telemetry.recordTaskOverdue({ total: [] });
    collected = await collect();
    expect(collected.get('kibana.task.overdue.count')).toEqual([
      expect.objectContaining({ attributes: {}, value: 0 }),
    ]);
  });
});
