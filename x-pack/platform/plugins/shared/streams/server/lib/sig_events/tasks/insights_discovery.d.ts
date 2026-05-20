import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { type Insight } from '@kbn/streams-schema';
import type { TaskContext } from '../../tasks/task_definitions';
export interface InsightsDiscoveryTaskResult {
    insights: Insight[];
    tokensUsed: ChatCompletionTokenCount;
}
export interface InsightsDiscoveryTaskParams {
    /** When provided, only generate insights for these stream names. Otherwise all streams are used. */
    streamNames?: string[];
    connectorId?: string;
}
export declare const STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE = "streams_insights_discovery";
export declare function createStreamsInsightsDiscoveryTask(taskContext: TaskContext): {
    streams_insights_discovery: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
