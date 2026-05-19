/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { TaskScheduling } from '../../task_scheduling';
import type { IntervalSchedule } from '../../task';
export declare class UiamProvisioningFeatureFlagScheduler {
  private readonly logger;
  private featureFlagSubscription;
  private appliedFlagValue;
  constructor(logger: Logger);
  start({
    core,
    taskScheduling,
    removeIfExists,
    schedule,
  }: {
    core: CoreStart;
    taskScheduling: TaskScheduling;
    removeIfExists: (id: string) => Promise<void>;
    schedule: IntervalSchedule;
  }): void;
  stop(): void;
}
