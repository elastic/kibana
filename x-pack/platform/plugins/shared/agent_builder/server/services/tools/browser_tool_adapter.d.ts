import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common';
/**
 * Create a browser tool adapter that registers browser tools as LLM tools
 */
export declare function createBrowserToolAdapter({ browserTool }: {
    browserTool: BrowserApiToolMetadata;
}): import("@langchain/core/tools").DynamicStructuredTool<import("zod/v4/core/json-schema").JSONSchema, unknown, unknown, (string | {
    results: {
        type: ToolResultType;
        data: {
            message: string;
            callId: string;
            executeOnClient: boolean;
        };
    }[];
})[]>;
/**
 * Convert browser API tools to LLM-compatible tool definitions
 */
export declare function browserToolsToLangchain({ browserApiTools, }: {
    browserApiTools: BrowserApiToolMetadata[];
}): {
    tools: import("@langchain/core/tools").DynamicStructuredTool<import("zod/v4/core/json-schema").JSONSchema, unknown, unknown, (string | {
        results: {
            type: ToolResultType;
            data: {
                message: string;
                callId: string;
                executeOnClient: boolean;
            };
        }[];
    })[]>[];
    idMappings: Map<string, string>;
};
