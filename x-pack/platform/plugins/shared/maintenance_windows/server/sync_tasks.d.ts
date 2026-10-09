import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
/**
 * Consumers register Task Manager task instance IDs. On maintenance window
 * mutations, this registry only calls `taskManager.runSoon` — no arbitrary
 * callbacks, so work stays inside the consumer's own task runner.
 */
export declare class MaintenanceWindowSyncTasks {
    private readonly logger;
    private readonly taskIdCounts;
    private taskManager?;
    constructor(logger: Logger);
    setTaskManager(taskManager: TaskManagerStartContract): void;
    register: (taskId: string) => (() => void);
    runSoon: () => void;
    private runSoonWithRetry;
}
