import type { Message, ToolChoice, ToolDefinition } from '@kbn/inference-common';
export declare function wrapWithSimulatedFunctionCalling({ messages, system, tools, toolChoice, }: {
    messages: Message[];
    system?: string;
    tools?: Record<string, ToolDefinition>;
    toolChoice?: ToolChoice<string>;
}): {
    messages: Message[];
    system: string;
};
