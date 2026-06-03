import type { Message, ToolCallOfToolDefinitions, ToolMessageOf } from '@kbn/inference-common';
export declare const REASON_TOOL: {
    readonly description: "reason or reflect about the task ahead or the results";
    readonly schema: {
        readonly type: "object";
        readonly properties: {};
    };
};
export declare const NEXT_TOOL: {
    readonly description: "perform the next step in the process";
    readonly schema: {
        readonly type: "object";
        readonly properties: {};
    };
};
export declare const COMPLETE_TOOL: {
    readonly description: "complete the task based on the last output";
    readonly schema: {
        readonly type: "object";
        readonly properties: {};
    };
};
export declare const PLANNING_TOOLS: {
    readonly reason: {
        readonly description: "reason or reflect about the task ahead or the results";
        readonly schema: {
            readonly type: "object";
            readonly properties: {};
        };
    };
    readonly complete: {
        readonly description: "complete the task based on the last output";
        readonly schema: {
            readonly type: "object";
            readonly properties: {};
        };
    };
};
export type PlanningTools = typeof PLANNING_TOOLS;
export type PlanningToolCallName = 'reason' | 'complete';
export type ReasonToolDefinition = {
    reason: typeof REASON_TOOL;
};
export type CompleteToolDefinition = {
    complete: typeof COMPLETE_TOOL;
};
export type ReasonToolCall = ToolCallOfToolDefinitions<ReasonToolDefinition>;
export type CompleteToolCall = ToolCallOfToolDefinitions<CompleteToolDefinition>;
export type PlanningToolCall = ReasonToolCall | CompleteToolCall;
export type PlanningToolMessage = ToolMessageOf<{
    tools: ReasonToolDefinition & CompleteToolDefinition;
}, {
    complete: {};
    reason: {};
}>;
export declare function isPlanningToolName(name: string): name is PlanningToolCallName;
export declare function removeSystemToolCalls(messages: Message[], to?: number): Message[];
