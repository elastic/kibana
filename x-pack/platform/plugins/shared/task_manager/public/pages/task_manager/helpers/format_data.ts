/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat, max, min } from 'lodash';
import { Series } from '../timeseries';

interface ClaimMetrics {
  key: number;
  count: number;
  maxDuration: number;
  avgDuration: number;
  maxLoad: number;
  avgLoad: number;
}
interface RunMetrics {
  key: number;
  count: number;
  maxDuration: number;
  avgDuration: number;
  maxScheduleDelay: number;
  avgScheduleDelay: number;
  maxEventLoop: number;
}
export interface RunErrors {
  message: string;
  byTaskType: Array<{ type: string; count: number }>;
}

interface NodeResult {
  serverUuid: string;
  claim?: {
    success: number;
    failure: number;
    total: number;
    metrics: ClaimMetrics[];
  };
  run?: {
    success: number;
    failure: number;
    total: number;
    by_task_type: Record<string, { success: number; failure: number; total: number }>;
    metrics: RunMetrics[];
    errors: RunErrors[];
  };
}

export interface TaskTypeData {
  type: string;
  success: number;
  total: number;
}

export interface Data {
  numRecurringTasks: number;
  numNonrecurringTasks: number;
  numTasks: number;
  numBackgroundNodes: number;
  byNode: NodeResult[];
}

export interface Result {
  numBackgroundNodes: number;
  numTasks: number;
  numRecurringTasks: number;
  claimDurationMetric: Series[];
  loadMetric: Series[];
  runDurationMetric: Series[];
  scheduleDelayMetric: Series[];
  taskTypeSuccess: TaskTypeData[];
  taskRunErrors: RunErrors[];
}

export const formatData = (data: Data, nodeId?: string): Result => {
  const nodeResults = data.byNode.filter((nodeResult) => {
    if (nodeId) {
      return nodeResult.serverUuid === nodeId;
    }
    return true;
  });

  const taskTypeSuccessRate: TaskTypeData[] = [];
  data.byNode
    .filter((nodeResult) => {
      if (nodeId) {
        return nodeResult.serverUuid === nodeId;
      }
      return true;
    })
    .forEach((nodeResult) => {
      const types = Object.keys(nodeResult.run?.by_task_type ?? {});
      types.forEach((type) => {
        const index = taskTypeSuccessRate.findIndex((taskType) => taskType.type === type);
        if (index > -1) {
          taskTypeSuccessRate[index] = {
            success:
              taskTypeSuccessRate[index].success +
              (nodeResult.run?.by_task_type[type].success ?? 0),
            total:
              taskTypeSuccessRate[index].total + (nodeResult.run?.by_task_type[type].total ?? 0),
            type,
          };
        } else {
          taskTypeSuccessRate.push({
            success: nodeResult.run?.by_task_type[type].success ?? 0,
            total: nodeResult.run?.by_task_type[type].total ?? 0,
            type,
          });
        }
      });
    });

  const taskRunErrors: RunErrors[] = [];

  data.byNode
    .filter((nodeResult) => {
      if (nodeId) {
        return nodeResult.serverUuid === nodeId;
      }
      return true;
    })
    .forEach((nodeResult) => {
      const errors = nodeResult.run?.errors ?? [];
      errors.forEach((error) => {
        const index = taskRunErrors.findIndex((e) => e.message === error.message);
        if (index > -1) {
          const existingErrors = taskRunErrors[index];
          error.byTaskType.forEach((taskType) => {
            const taskTypeIndex = existingErrors.byTaskType.findIndex(
              (t) => t.type === taskType.type
            );

            if (taskTypeIndex > -1) {
              existingErrors.byTaskType[taskTypeIndex] = {
                type: taskType.type,
                count: existingErrors.byTaskType[taskTypeIndex].count + taskType.count,
              };
            } else {
              existingErrors.byTaskType.push(taskType);
            }
          });
          taskRunErrors.splice(index, 1, existingErrors);
        } else {
          taskRunErrors.push(error);
        }
      });
    });
  return {
    numBackgroundNodes: data.numBackgroundNodes,
    numTasks: data.numTasks,
    numRecurringTasks: data.numRecurringTasks,
    taskTypeSuccess: taskTypeSuccessRate,
    taskRunErrors,
    claimDurationMetric: concat(
      nodeResults.map((nodeResult) => {
        return {
          bucket_size: '10 seconds',
          data: nodeResult.claim?.metrics.map((metric) => [metric.key, metric.avgDuration]) ?? [],
          metric: {
            app: 'kibana',
            description: 'Duration of each claim cycle',
            format: '0,0.[00]',
            label: `avg ${nodeResult.serverUuid}`,
            metricAgg: 'avg',
            title: 'Avg Claim Duration',
            units: 'ms',
          },
          timeRange: {
            min: min(nodeResult.claim?.metrics.map((metric) => metric.key)) ?? 0,
            max: max(nodeResult.claim?.metrics.map((metric) => metric.key)) ?? 0,
          },
        };
      }),
      nodeResults.map((nodeResult) => {
        return {
          bucket_size: '10 seconds',
          data: nodeResult.claim?.metrics.map((metric) => [metric.key, metric.maxDuration]) ?? [],
          metric: {
            app: 'kibana',
            description: 'Duration of each claim cycle',
            format: '0,0.[00]',
            label: `max ${nodeResult.serverUuid}`,
            metricAgg: 'max',
            title: 'Max Claim Duration',
            units: 'ms',
          },
          timeRange: {
            min: min(nodeResult.claim?.metrics.map((metric) => metric.key)) ?? 0,
            max: max(nodeResult.claim?.metrics.map((metric) => metric.key)) ?? 0,
          },
        };
      })
    ),
    loadMetric: concat(
      nodeResults.map((nodeResult) => {
        return {
          bucket_size: '10 seconds',
          data: nodeResult.claim?.metrics.map((metric) => [metric.key, metric.avgLoad]) ?? [],
          metric: {
            app: 'kibana',
            description: 'Task load during each claim cycle',
            format: '0,0.[00]',
            label: `avg ${nodeResult.serverUuid}`,
            metricAgg: 'avg',
            title: 'Avg Load',
            units: '%',
          },
          timeRange: {
            min: min(nodeResult.claim?.metrics.map((metric) => metric.key)) ?? 0,
            max: max(nodeResult.claim?.metrics.map((metric) => metric.key)) ?? 0,
          },
        };
      }),
      nodeResults.map((nodeResult) => {
        return {
          bucket_size: '10 seconds',
          data: nodeResult.claim?.metrics.map((metric) => [metric.key, metric.maxLoad]) ?? [],
          metric: {
            app: 'kibana',
            description: 'Task load during each claim cycle',
            format: '0,0.[00]',
            label: `max ${nodeResult.serverUuid}`,
            metricAgg: 'max',
            title: 'Max Load',
            units: '%',
          },
          timeRange: {
            min: min(nodeResult.claim?.metrics.map((metric) => metric.key)) ?? 0,
            max: max(nodeResult.claim?.metrics.map((metric) => metric.key)) ?? 0,
          },
        };
      })
    ),
    runDurationMetric: concat(
      nodeResults.map((nodeResult) => {
        return {
          bucket_size: '10 seconds',
          data:
            nodeResult.run?.metrics.map((metric) => [metric.key, metric.avgDuration ?? 0]) ?? [],
          metric: {
            app: 'kibana',
            description: 'Duration of each task run',
            format: '0,0.[00]',
            label: `avg ${nodeResult.serverUuid}`,
            metricAgg: 'avg',
            title: 'Avg Task Run Duration',
            units: 'ms',
          },
          timeRange: {
            min: min(nodeResult.run?.metrics.map((metric) => metric.key)) ?? 0,
            max: max(nodeResult.run?.metrics.map((metric) => metric.key)) ?? 0,
          },
        };
      }),
      nodeResults.map((nodeResult) => {
        return {
          bucket_size: '10 seconds',
          data:
            nodeResult.run?.metrics.map((metric) => [metric.key, metric.maxDuration ?? 0]) ?? [],
          metric: {
            app: 'kibana',
            description: 'Duration of each task run',
            format: '0,0.[00]',
            label: `max ${nodeResult.serverUuid}`,
            metricAgg: 'max',
            title: 'Max Task Run Duration',
            units: 'ms',
          },
          timeRange: {
            min: min(nodeResult.run?.metrics.map((metric) => metric.key)) ?? 0,
            max: max(nodeResult.run?.metrics.map((metric) => metric.key)) ?? 0,
          },
        };
      })
    ),
    scheduleDelayMetric: concat(
      nodeResults.map((nodeResult) => {
        return {
          bucket_size: '10 seconds',
          data:
            nodeResult.run?.metrics.map((metric) => [metric.key, metric.avgScheduleDelay ?? 0]) ??
            [],
          metric: {
            app: 'kibana',
            description: 'Schedule delay of each task',
            format: '0,0.[00]',
            label: `avg ${nodeResult.serverUuid}`,
            metricAgg: 'avg',
            title: 'Avg Schedule Delay',
            units: 'ms',
          },
          timeRange: {
            min: min(nodeResult.run?.metrics.map((metric) => metric.key)) ?? 0,
            max: max(nodeResult.run?.metrics.map((metric) => metric.key)) ?? 0,
          },
        };
      }),
      nodeResults.map((nodeResult) => {
        return {
          bucket_size: '10 seconds',
          data:
            nodeResult.run?.metrics.map((metric) => [metric.key, metric.maxScheduleDelay ?? 0]) ??
            [],
          metric: {
            app: 'kibana',
            description: 'Schedule delay of each task',
            format: '0,0.[00]',
            label: `max ${nodeResult.serverUuid}`,
            metricAgg: 'max',
            title: 'Max Schedule Delay',
            units: 'ms',
          },
          timeRange: {
            min: min(nodeResult.run?.metrics.map((metric) => metric.key)) ?? 0,
            max: max(nodeResult.run?.metrics.map((metric) => metric.key)) ?? 0,
          },
        };
      })
    ),
  };
};
