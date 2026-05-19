import type { Message, ToolSchemaType } from '@kbn/inference-common';
import { type ToolOptions } from '@kbn/inference-common';
import type { ToolChoice as ConverseBedRockToolChoice } from '@aws-sdk/client-bedrock-runtime';
export declare const toolChoiceToConverse: (toolChoice: ToolOptions["toolChoice"]) => ConverseBedRockToolChoice | undefined;
export declare const toolsToConverseBedrock: (tools: ToolOptions["tools"], messages: Message[]) => {
    toolSpec: {
        name: string;
        description: string;
        inputSchema: {
            json: import("@kbn/inference-common/src/chat_complete/tool_schema").ToolSchemaTypeObject;
        };
    };
}[] | {
    toolSpec: {
        name: string;
        description: string;
        inputSchema: {
            json: {
                type: string;
                properties: {};
            };
        };
    };
}[] | undefined;
/**
 * Claude is prone to ignoring the "array" part of an array type,
 * so this function patches it to add a message on each
 * array property to explicitly state that the value should
 * be returned as a json array.
 *
 * Also strips JSON Schema keywords unsupported by Bedrock
 * (e.g. `propertyNames`, `additionalProperties`).
 */
export declare function fixSchemaArrayProperties<T extends ToolSchemaType>(schemaPart: T): T;
