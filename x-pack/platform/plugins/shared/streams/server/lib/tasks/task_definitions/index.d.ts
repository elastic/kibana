import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ReadOnlyConversationClient } from '@kbn/agent-builder-server';
import type { GetScopedClients } from '../../../routes/types';
import type { StreamsServer } from '../../../types';
import type { EbtTelemetryClient } from '../../telemetry';
export interface TaskContext {
    logger: Logger;
    getScopedClients: GetScopedClients;
    telemetry: EbtTelemetryClient;
    getInternalEsClient: () => ElasticsearchClient;
    getConversationsClient: (request: KibanaRequest) => Promise<ReadOnlyConversationClient | undefined>;
    server: StreamsServer;
}
export declare function createTaskDefinitions(taskContext: TaskContext): {
    streams_memory_consolidation: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
    streams_conversation_scraper: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
    streams_memory_update: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
    streams_memory_generation: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
    streams_onboarding: {
        timeout: string;
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
    streams_insights_discovery: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
    streams_features_identification: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
    streams_significant_events_queries_generation: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
    streams_description_generation: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("../../../../../task_manager/server/task").AnyRunResult>;
        };
    };
};
export type StreamsTaskType = keyof ReturnType<typeof createTaskDefinitions>;
