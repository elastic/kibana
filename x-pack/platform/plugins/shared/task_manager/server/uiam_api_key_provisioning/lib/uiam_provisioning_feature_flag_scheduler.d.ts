import type { CoreStart, Logger } from '@kbn/core/server';
import type { TaskScheduling } from '../../task_scheduling';
import type { IntervalSchedule } from '../../task';
export declare class UiamProvisioningFeatureFlagScheduler {
    private readonly logger;
    private featureFlagSubscription;
    private appliedFlagValue;
    constructor(logger: Logger);
    start({ core, taskScheduling, removeIfExists, schedule, }: {
        core: CoreStart;
        taskScheduling: TaskScheduling;
        removeIfExists: (id: string) => Promise<void>;
        schedule: IntervalSchedule;
    }): void;
    stop(): void;
}
