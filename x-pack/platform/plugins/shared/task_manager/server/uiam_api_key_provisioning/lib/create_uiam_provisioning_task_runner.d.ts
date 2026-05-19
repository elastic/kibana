/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { TaskManagerStartContract } from '../..';
import type { ConcreteTaskInstance } from '../../task';
import type { TaskManagerPluginsStart } from '../../plugin';
import type { TaskManagerUiamProvisioningRunEventData } from '../event_based_telemetry';
export interface UiamProvisioningRunTaskOutcome {
  state: {
    runs: number;
  };
  runAt?: Date;
  telemetry: TaskManagerUiamProvisioningRunEventData;
}
export interface UiamProvisioningTaskRunnerDeps {
  runTask: (
    taskInstance: ConcreteTaskInstance,
    coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>
  ) => Promise<UiamProvisioningRunTaskOutcome>;
  reportProvisioningRunEvent: (telemetry: TaskManagerUiamProvisioningRunEventData) => void;
}
export declare const createUiamProvisioningTaskRunner: (
  coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>,
  deps: UiamProvisioningTaskRunnerDeps
) => ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
  run: () => Promise<{
    state: {
      runs: number;
    };
    runAt?: Date;
  }>;
  cancel: () => Promise<void>;
};
