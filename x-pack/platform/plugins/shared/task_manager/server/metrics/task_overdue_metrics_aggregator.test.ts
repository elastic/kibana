/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asOk } from '../lib/result_type';
import { asTaskManagerMetricEvent } from '../task_events';
import { TaskManagerMetrics } from './task_metrics_collector';
import { TaskOverdueMetricsAggregator } from './task_overdue_metrics_aggregator';

export const getTaskManagerMetricEvent = (value: TaskManagerMetrics) => {
  return asTaskManagerMetricEvent(asOk(value));
};

describe('TaskOverdueMetricsAggregator', () => {
  let taskOverdueMetricsAggregator: TaskOverdueMetricsAggregator;
  beforeEach(() => {
    taskOverdueMetricsAggregator = new TaskOverdueMetricsAggregator();
  });

  test('should correctly initialize', () => {
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: {
        overdue_by: { counts: [], values: [] },
        overdue_by_values: [],
      },
      by_type: {},
    });
  });

  test('should correctly return initialMetrics', () => {
    expect(taskOverdueMetricsAggregator.initialMetric()).toEqual({
      overall: {
        overdue_by: { counts: [], values: [] },
        overdue_by_values: [],
      },
      by_type: {},
    });
  });

  test('should correctly process task manager metric event', () => {
    taskOverdueMetricsAggregator.processTaskLifecycleEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          telemetry: [
            { key: 0, doc_count: 1 },
            { key: 20, doc_count: 1 },
          ],
          total: [
            { key: 0, doc_count: 1 },
            { key: 20, doc_count: 1 },
          ],
        },
      })
    );
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: {
        overdue_by: { counts: [1, 0, 1], values: [10, 20, 30] },
        overdue_by_values: [0, 20],
      },
      by_type: {
        telemetry: {
          overdue_by: { counts: [1, 0, 1], values: [10, 20, 30] },
          overdue_by_values: [0, 20],
        },
      },
    });
  });

  test('should correctly process empty task manager metric event', () => {
    taskOverdueMetricsAggregator.processTaskLifecycleEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          total: [],
        },
      })
    );
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: {
        overdue_by: { counts: [], values: [] },
        overdue_by_values: [],
      },
      by_type: {},
    });
  });

  test('should correctly return latest metric event', () => {
    taskOverdueMetricsAggregator.processTaskLifecycleEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          telemetry: [
            { key: 0, doc_count: 1 },
            { key: 20, doc_count: 1 },
          ],
          total: [
            { key: 0, doc_count: 1 },
            { key: 20, doc_count: 1 },
          ],
        },
      })
    );
    taskOverdueMetricsAggregator.processTaskLifecycleEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          telemetry: [{ key: 40, doc_count: 1 }],
          total: [{ key: 40, doc_count: 1 }],
        },
      })
    );
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: {
        overdue_by: { counts: [0, 0, 0, 0, 1], values: [10, 20, 30, 40, 50] },
        overdue_by_values: [40],
      },
      by_type: {
        telemetry: {
          overdue_by: { counts: [0, 0, 0, 0, 1], values: [10, 20, 30, 40, 50] },
          overdue_by_values: [40],
        },
      },
    });
  });

  test('should correctly group alerting and action task types', () => {
    taskOverdueMetricsAggregator.processTaskLifecycleEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          'alerting:example': [{ key: 40, doc_count: 1 }],
          'alerting:.index-threshold': [
            { key: 20, doc_count: 2 },
            { key: 120, doc_count: 1 },
          ],
          'actions:webhook': [{ key: 0, doc_count: 2 }],
          'actions:.email': [{ key: 0, doc_count: 1 }],
          total: [
            { key: 0, doc_count: 3 },
            { key: 20, doc_count: 2 },
            { key: 40, doc_count: 1 },
            { key: 120, doc_count: 1 },
          ],
        },
      })
    );

    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: {
        overdue_by: {
          counts: [3, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
          values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
        },
        overdue_by_values: [0, 0, 0, 20, 20, 40, 120],
      },
      by_type: {
        'alerting:example': {
          overdue_by: {
            counts: [0, 0, 0, 0, 1],
            values: [10, 20, 30, 40, 50],
          },
          overdue_by_values: [40],
        },
        'alerting:__index-threshold': {
          overdue_by: {
            counts: [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
          },
          overdue_by_values: [20, 20, 120],
        },
        alerting: {
          overdue_by: {
            counts: [0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
            values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
          },
          overdue_by_values: [40, 20, 20, 120],
        },
        'actions:webhook': {
          overdue_by: {
            counts: [2],
            values: [10],
          },
          overdue_by_values: [0, 0],
        },
        'actions:__email': {
          overdue_by: {
            counts: [1],
            values: [10],
          },
          overdue_by_values: [0],
        },
        actions: {
          overdue_by: {
            counts: [3],
            values: [10],
          },
          overdue_by_values: [0, 0, 0],
        },
      },
    });
  });

  test('should correctly ignore reset events', () => {
    taskOverdueMetricsAggregator.processTaskLifecycleEvent(
      getTaskManagerMetricEvent({
        numOverdueTasks: {
          'alerting:example': [{ key: 40, doc_count: 1 }],
          'alerting:.index-threshold': [
            { key: 20, doc_count: 2 },
            { key: 120, doc_count: 1 },
          ],
          'actions:webhook': [{ key: 0, doc_count: 2 }],
          'actions:.email': [{ key: 0, doc_count: 1 }],
          total: [
            { key: 0, doc_count: 3 },
            { key: 20, doc_count: 2 },
            { key: 40, doc_count: 1 },
            { key: 120, doc_count: 1 },
          ],
        },
      })
    );
    taskOverdueMetricsAggregator.reset();
    expect(taskOverdueMetricsAggregator.collect()).toEqual({
      overall: {
        overdue_by: {
          counts: [3, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
          values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
        },
        overdue_by_values: [0, 0, 0, 20, 20, 40, 120],
      },
      by_type: {
        'alerting:example': {
          overdue_by: {
            counts: [0, 0, 0, 0, 1],
            values: [10, 20, 30, 40, 50],
          },
          overdue_by_values: [40],
        },
        'alerting:__index-threshold': {
          overdue_by: {
            counts: [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
          },
          overdue_by_values: [20, 20, 120],
        },
        alerting: {
          overdue_by: {
            counts: [0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
            values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
          },
          overdue_by_values: [40, 20, 20, 120],
        },
        'actions:webhook': {
          overdue_by: {
            counts: [2],
            values: [10],
          },
          overdue_by_values: [0, 0],
        },
        'actions:__email': {
          overdue_by: {
            counts: [1],
            values: [10],
          },
          overdue_by_values: [0],
        },
        actions: {
          overdue_by: {
            counts: [3],
            values: [10],
          },
          overdue_by_values: [0, 0, 0],
        },
      },
    });
  });
});
