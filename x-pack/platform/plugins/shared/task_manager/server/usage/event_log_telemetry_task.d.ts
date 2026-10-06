/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import { type RunContext } from '../task';
import type { TaskManagerStartContract } from '..';
import type { TaskManagerPluginsStart } from '../plugin';
type CoreStartServices = () => Promise<
  [CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]
>;
/**
 * Schedules the single cluster-wide snapshot telemetry task. Task Manager keys the task by id, so
 * only one Kibana in the fleet runs the aggregation regardless of how many call this.
 */
export declare function scheduleEventLogTelemetryTask(
  logger: Logger,
  taskScheduling: TaskScheduling
): Promise<void>;
export declare function registerEventLogTelemetryTask(
  logger: Logger,
  coreStartServices: CoreStartServices,
  taskTypeDictionary: TaskTypeDictionary
): void;
export declare function taskRunner(
  logger: Logger,
  coreStartServices: CoreStartServices
): ({ taskInstance, signal }: RunContext) => {
  run(): Promise<{
    state: Readonly<
      {
        error_messages?: string[] | undefined;
        total_task_runs_24hr?: number | undefined;
        task_runs_by_type_24hr?:
          | Readonly<
              {} & {
                name: string;
                value: number;
              }
            >[]
          | undefined;
        task_runs_other_24hr?: number | undefined;
        schedule_delay_ms_24hr?:
          | Readonly<
              {} & {
                p50: number | null;
                p75: number | null;
                p95: number | null;
                p99: number | null;
              }
            >
          | undefined;
      } & {
        has_errors: boolean;
        runs: number;
      }
    >;
    schedule: import('@kbn/response-ops-scheduling-types').IntervalSchedule;
  }>;
};
export {};
