import type { TaskContext } from '../../tasks/task_definitions';
export interface SignificantEventsQueriesGenerationTaskParams {
    start: number;
    end: number;
    sampleDocsSize?: number;
    streamName: string;
    connectorId?: string;
}
export declare const SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE = "streams_significant_events_queries_generation";
export declare function getSignificantEventsQueriesGenerationTaskId(streamName: string): string;
export declare function createStreamsSignificantEventsQueriesGenerationTask(taskContext: TaskContext): {
    streams_significant_events_queries_generation: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
