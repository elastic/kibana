import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { TaskClient } from './task_client';
import type { TaskContext } from './task_definitions';
export declare class TaskService {
    private readonly taskManagerSetup;
    constructor(taskManagerSetup: TaskManagerSetupContract);
    registerTasks(taskContext: TaskContext): void;
    getClient(coreStart: CoreStart, taskManagerStart: TaskManagerStartContract, logger: Logger): Promise<TaskClient<"streams_description_generation" | "streams_significant_events_queries_generation" | "streams_features_identification" | "streams_insights_discovery" | "streams_onboarding" | "streams_memory_generation" | "streams_memory_update" | "streams_conversation_scraper" | "streams_memory_consolidation">>;
}
