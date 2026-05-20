import { type ToolDefinition } from '@kbn/inference-common';
export declare const createSummarizeStreamsPrompt: ({ additionalTools, systemPromptSuffix, }?: {
    additionalTools?: Record<string, ToolDefinition>;
    systemPromptSuffix?: string;
}) => import("@kbn/inference-common").Prompt<{
    streamInsights: string;
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
            readonly description: "Submit system-level insights correlating across streams";
            readonly schema: import("@kbn/inference-common/src/chat_complete/tool_schema").ToolSchemaTypeObject;
        };
    };
}]>;
/** @deprecated Use createSummarizeStreamsPrompt() instead */
export declare const SummarizeStreamsPrompt: import("@kbn/inference-common").Prompt<{
    streamInsights: string;
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
            readonly description: "Submit system-level insights correlating across streams";
            readonly schema: import("@kbn/inference-common/src/chat_complete/tool_schema").ToolSchemaTypeObject;
        };
    };
}]>;
