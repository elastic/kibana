import type { TaskContext } from '.';
export type MemoryConsolidationTaskParams = Record<string, never>;
export interface MemoryConsolidationTaskResult {
    entriesProcessed: number;
}
export declare const MEMORY_CONSOLIDATION_TASK_TYPE = "streams_memory_consolidation";
export declare function createStreamsMemoryConsolidationTask(taskContext: TaskContext): {
    streams_memory_consolidation: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
