/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { HealthStatus } from '../monitoring';
import type { MonitoredHealth } from '../routes/health';
import { redactHealth, redactMetrics } from './redact_monitoring_stats';
import {
  createNodeMetricsWithTaskTypes,
  createRawMonitoringStatsWithTaskTypes,
  MOCK_PAUSED_TASK_TYPE,
  MOCK_TASK_TYPE,
  MOCK_TASK_TYPE_GROUP,
} from './redact_monitoring_stats.mock';

const createHealth = () => ({
  id: 'kibana-uuid',
  timestamp: '2026-11-23T10:00:01.000Z',
  status: HealthStatus.OK,
  reason: 'Task Manager is healthy',
  ...createRawMonitoringStatsWithTaskTypes(),
});

const expectNoTaskTypes = (body: object) => {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain(MOCK_TASK_TYPE);
  expect(serialized).not.toContain(MOCK_TASK_TYPE.replaceAll('.', '__'));
  expect(serialized).not.toContain(MOCK_PAUSED_TASK_TYPE);
};

describe('redactHealth', () => {
  it('removes all per-task-type data', () => {
    expectNoTaskTypes(redactHealth(createHealth()));
  });

  it('keeps aggregate data and empties per-task-type fields', () => {
    const health = createHealth();
    const { configuration, workload, runtime, capacity_estimation } = health.stats;

    expect(redactHealth(health)).toEqual({
      ...health,
      stats: {
        configuration: {
          ...configuration,
          value: {
            ...configuration.value,
            monitored_task_execution_thresholds: {
              ...configuration.value.monitored_task_execution_thresholds,
              custom: {},
            },
            execution_control: { ...configuration.value.execution_control, paused_task_types: [] },
          },
        },
        workload: { ...workload, value: { ...workload.value, task_types: {}, schedule: [] } },
        runtime: {
          ...runtime,
          value: {
            ...runtime.value,
            drift_by_type: {},
            execution: {
              ...runtime.value.execution,
              duration: {},
              result_frequency_percent_as_number: {},
            },
          },
        },
        capacity_estimation,
      },
    });
  });

  it('drops fields that are not explicitly allowed', () => {
    const health = merge(createHealth(), {
      unexpected: MOCK_TASK_TYPE,
      stats: {
        unexpected: { [MOCK_TASK_TYPE]: 1 },
        configuration: { value: { unexpected: MOCK_TASK_TYPE } },
        workload: { value: { unexpected: MOCK_TASK_TYPE } },
        runtime: { value: { polling: { unexpected: MOCK_TASK_TYPE } } },
        capacity_estimation: { value: { observed: { unexpected: MOCK_TASK_TYPE } } },
      },
    });

    expectNoTaskTypes(redactHealth(health));
  });

  it('keeps missing stats missing', () => {
    const health: MonitoredHealth = {
      id: 'kibana-uuid',
      timestamp: '2026-11-23T10:00:01.000Z',
      status: HealthStatus.OK,
      last_update: '2026-11-23T10:00:00.000Z',
      stats: {},
    };

    expect(JSON.parse(JSON.stringify(redactHealth(health)))).toEqual(health);
  });
});

describe('redactMetrics', () => {
  it('removes all per-task-type data', () => {
    const redacted = redactMetrics(createNodeMetricsWithTaskTypes());

    expectNoTaskTypes(redacted);
    expect(JSON.stringify(redacted)).not.toContain(`"${MOCK_TASK_TYPE_GROUP}"`);
  });

  it('keeps aggregate data and empties per-task-type fields', () => {
    const nodeMetrics = createNodeMetricsWithTaskTypes();
    const { task_run, task_overdue } = nodeMetrics.metrics;

    expect(redactMetrics(nodeMetrics)).toEqual({
      ...nodeMetrics,
      metrics: {
        ...nodeMetrics.metrics,
        task_run: { ...task_run, value: { ...task_run.value, by_type: {} } },
        task_overdue: { ...task_overdue, value: { ...task_overdue.value, by_type: {} } },
      },
    });
  });

  it('drops fields that are not explicitly allowed', () => {
    const nodeMetrics = merge(createNodeMetricsWithTaskTypes(), {
      unexpected: MOCK_TASK_TYPE,
      metrics: {
        unexpected: { timestamp: 'now', value: { [MOCK_TASK_TYPE]: 1 } },
        task_claim: { value: { unexpected: MOCK_TASK_TYPE } },
        task_run: { value: { overall: { unexpected: MOCK_TASK_TYPE } } },
        task_backpressure: { value: { unexpected: MOCK_TASK_TYPE } },
      },
    });

    expectNoTaskTypes(redactMetrics(nodeMetrics));
  });

  it('keeps null metrics null', () => {
    const nodeMetrics = { ...createNodeMetricsWithTaskTypes(), metrics: null };

    expect(redactMetrics(nodeMetrics)).toEqual(nodeMetrics);
  });
});
