import { type ToolDefinition } from '@kbn/inference-common';
export declare const createSummarizeQueriesPrompt: ({ additionalTools, systemPromptSuffix, }?: {
    additionalTools?: Record<string, ToolDefinition>;
    systemPromptSuffix?: string;
}) => import("@kbn/inference-common").Prompt<{
    streamName: string;
    queries: string;
}, [{
    system: {
        mustache: {
            template: any;
        };
    };
    template: {
        mustache: {
            template: any;
        };
    };
    tools: {
        readonly submit_insights: {
            readonly description: "Submit the identified insights for this stream";
            readonly schema: import("@kbn/inference-common/src/chat_complete/tool_schema").ToolSchemaTypeObject;
        };
    };
}]>;
/** @deprecated Use createSummarizeQueriesPrompt() instead */
export declare const SummarizeQueriesPrompt: import("@kbn/inference-common").Prompt<{
    streamName: string;
    queries: string;
}, [{
    system: {
        mustache: {
            template: any;
        };
    };
    template: {
        mustache: {
            template: any;
        };
    };
    tools: {
        readonly submit_insights: {
            readonly description: "Submit the identified insights for this stream";
            readonly schema: import("@kbn/inference-common/src/chat_complete/tool_schema").ToolSchemaTypeObject;
        };
    };
}]>;
