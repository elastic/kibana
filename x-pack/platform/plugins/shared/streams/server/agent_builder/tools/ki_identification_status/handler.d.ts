import type { TaskClient } from '../../../lib/tasks/task_client';
import type { StreamsTaskType } from '../../../lib/tasks/task_definitions';
interface GetKiIdentificationStatusHandlerParams {
    streamName: string;
    taskClient: TaskClient<StreamsTaskType>;
}
export declare function getKiIdentificationStatusToolHandler({ streamName, taskClient, }: GetKiIdentificationStatusHandlerParams): Promise<{
    status: import("@kbn/streams-schema").TaskStatus.NotStarted | import("@kbn/streams-schema").TaskStatus.InProgress | import("@kbn/streams-schema").TaskStatus.Stale | import("@kbn/streams-schema").TaskStatus.BeingCanceled | import("@kbn/streams-schema").TaskStatus.Canceled;
    stream_name: string;
    task_id: string;
} | {
    status: import("@kbn/streams-schema").TaskStatus.Failed;
    error: string;
    featuresTaskResult?: import("@kbn/streams-schema").TaskResult<import("@kbn/streams-schema").IdentifyFeaturesResult> | undefined;
    queriesTaskResult?: import("@kbn/streams-schema").TaskResult<import("@kbn/streams-schema").SignificantEventsQueriesGenerationResult> | undefined;
    stream_name: string;
    task_id: string;
} | {
    status: import("@kbn/streams-schema").TaskStatus.Completed;
    featuresTaskResult?: import("@kbn/streams-schema").TaskResult<import("@kbn/streams-schema").IdentifyFeaturesResult>;
    queriesTaskResult?: import("@kbn/streams-schema").TaskResult<import("@kbn/streams-schema").SignificantEventsQueriesGenerationResult>;
    stream_name: string;
    task_id: string;
} | {
    status: import("@kbn/streams-schema").TaskStatus.Acknowledged;
    featuresTaskResult?: import("@kbn/streams-schema").TaskResult<import("@kbn/streams-schema").IdentifyFeaturesResult>;
    queriesTaskResult?: import("@kbn/streams-schema").TaskResult<import("@kbn/streams-schema").SignificantEventsQueriesGenerationResult>;
    stream_name: string;
    task_id: string;
}>;
export {};
