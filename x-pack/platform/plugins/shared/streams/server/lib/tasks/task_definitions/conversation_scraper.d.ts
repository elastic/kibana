import type { TaskContext } from '.';
export type ConversationScraperTaskParams = Record<string, never>;
export interface ConversationScraperTaskResult {
    conversationsProcessed: number;
}
export declare const CONVERSATION_SCRAPER_TASK_TYPE = "streams_conversation_scraper";
export declare function createStreamsConversationScraperTask(taskContext: TaskContext): {
    streams_conversation_scraper: {
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
