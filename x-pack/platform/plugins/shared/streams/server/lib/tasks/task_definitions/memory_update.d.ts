import type { TaskContext } from '.';
export interface MemoryUpdateTaskParams {
    triggerId: string;
    payload: Record<string, unknown>;
}
export interface MemoryUpdateTaskResult {
    triggerId: string;
    success: boolean;
}
export declare const MEMORY_UPDATE_TASK_TYPE = "streams_memory_update";
export declare function createStreamsMemoryUpdateTask(taskContext: TaskContext): {
    streams_memory_update: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
