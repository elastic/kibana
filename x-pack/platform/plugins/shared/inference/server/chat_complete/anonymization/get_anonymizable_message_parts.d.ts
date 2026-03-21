import type { Message } from '@kbn/inference-common';
/**
 * getAnonymizableMessageParts returns just the data of a
 * message that needs to be anonymized. This prevents us
 * from anonymizing things that should not be anonymized
 * because of technical dependencies, like `role` or
 * `toolCallId`.
 */
export declare function getAnonymizableMessageParts(message: Message): {
    data?: import("@kbn/inference-common/src/chat_complete/tools").ToolData | undefined;
    response: import("@kbn/inference-common/src/chat_complete/tools").ToolResponse;
    content?: undefined;
    toolCalls?: undefined;
} | {
    content: string | null;
    toolCalls: {
        function: {
            name: string;
            arguments: import("@kbn/inference-common").ToolCallArguments;
        };
    }[] | undefined;
} | {
    content: import("@kbn/inference-common").MessageContent;
    toolCalls?: undefined;
};
