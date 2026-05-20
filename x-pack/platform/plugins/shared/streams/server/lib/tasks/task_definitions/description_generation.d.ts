import type { TaskContext } from '.';
export declare const DESCRIPTION_GENERATION_TASK_TYPE = "streams_description_generation";
export declare function getDescriptionGenerationTaskId(streamName: string): string;
export interface DescriptionGenerationTaskParams {
    connectorId: string;
    start: number;
    end: number;
    streamName: string;
}
export declare function createStreamsDescriptionGenerationTask(taskContext: TaskContext): {
    streams_description_generation: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
