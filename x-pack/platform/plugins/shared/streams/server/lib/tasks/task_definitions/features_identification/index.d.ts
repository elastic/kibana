import type { TaskContext } from '..';
export interface FeaturesIdentificationTaskParams {
    start: number;
    end: number;
    streamName: string;
    connectorId?: string;
}
export declare const FEATURES_IDENTIFICATION_TASK_TYPE = "streams_features_identification";
export declare function getFeaturesIdentificationTaskId(streamName: string): string;
export declare function createStreamsFeaturesIdentificationTask(taskContext: TaskContext): {
    streams_features_identification: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
