import type { CoreSetup } from '@kbn/core/server';
import type { TaskManagerStartContract } from '../..';
import type { ConcreteTaskInstance } from '../../task';
import type { TaskManagerPluginsStart } from '../../plugin';
import type { TaskManagerUiamProvisioningRunEventData } from '../event_based_telemetry';
import type { LatestTaskStateSchema } from '../task_state';
export interface UiamProvisioningRunTaskOutcome {
    state: LatestTaskStateSchema;
    runAt?: Date;
    telemetry: TaskManagerUiamProvisioningRunEventData;
}
export interface UiamProvisioningTaskRunnerDeps {
    runTask: (taskInstance: ConcreteTaskInstance, coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>) => Promise<UiamProvisioningRunTaskOutcome>;
    reportProvisioningRunEvent: (telemetry: TaskManagerUiamProvisioningRunEventData) => void;
}
export declare const createUiamProvisioningTaskRunner: (coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>, deps: UiamProvisioningTaskRunnerDeps) => ({ taskInstance }: {
    taskInstance: ConcreteTaskInstance;
}) => {
    run: () => Promise<{
        state: LatestTaskStateSchema;
        runAt?: Date;
    }>;
    cancel: () => Promise<void>;
};
