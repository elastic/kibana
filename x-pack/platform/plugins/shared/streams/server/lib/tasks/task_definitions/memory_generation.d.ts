import type { BaseFeature, GeneratedSignificantEventQuery, Insight } from '@kbn/streams-schema';
import type { TaskContext } from '.';
export interface MemoryGenerationTaskParams {
    insights?: Insight[];
    features?: BaseFeature[];
    queries?: Array<{
        streamName: string;
        query: GeneratedSignificantEventQuery;
    }>;
}
export interface MemoryGenerationTaskResult {
    streamsProcessed: number;
}
export declare const MEMORY_GENERATION_TASK_TYPE = "streams_memory_generation";
export declare function createStreamsMemoryGenerationTask(taskContext: TaskContext): {
    streams_memory_generation: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
