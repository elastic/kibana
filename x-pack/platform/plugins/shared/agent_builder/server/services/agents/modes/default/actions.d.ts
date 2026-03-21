import type { AgentBuilderAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { ToolCall } from '@kbn/agent-builder-genai-utils/langchain';
export declare enum AgentActionType {
    Error = "error",
    ToolCall = "tool_call",
    ExecuteTool = "execute_tool",
    ToolPrompt = "tool_prompt",
    HandOver = "hand_over",
    Answer = "answer",
    StructuredAnswer = "structured_answer"
}
export interface ToolCallResult {
    toolCallId: string;
    content: string;
    artifact?: any;
}
export interface AgentErrorAction {
    type: AgentActionType.Error;
    error: AgentBuilderAgentExecutionError;
}
export interface ToolCallAction {
    type: AgentActionType.ToolCall;
    tool_calls: ToolCall[];
    message?: string;
}
export interface ExecuteToolAction {
    type: AgentActionType.ExecuteTool;
    tool_results: ToolCallResult[];
}
export interface ToolPromptAction {
    type: AgentActionType.ToolPrompt;
    tool_call_id: string;
    prompt: PromptRequest;
}
export interface HandoverAction {
    type: AgentActionType.HandOver;
    /** message of the agent for the handover */
    message: string;
    /** was the handover forced (budget limit) or not */
    forceful: boolean;
}
export type ResearchAgentAction = ToolCallAction | ExecuteToolAction | ToolPromptAction | HandoverAction | AgentErrorAction;
export interface AnswerAction {
    type: AgentActionType.Answer;
    message: string;
}
export interface StructuredAnswerAction {
    type: AgentActionType.StructuredAnswer;
    data: object;
}
export type AnswerAgentAction = AnswerAction | StructuredAnswerAction | AgentErrorAction;
export type AgentAction = ResearchAgentAction | AnswerAgentAction;
export declare function isAgentErrorAction(action: AgentAction): action is AgentErrorAction;
export declare function isToolCallAction(action: AgentAction): action is ToolCallAction;
export declare function isExecuteToolAction(action: AgentAction): action is ExecuteToolAction;
export declare function isToolPromptAction(action: AgentAction): action is ToolPromptAction;
export declare function isHandoverAction(action: AgentAction): action is HandoverAction;
export declare function isAnswerAction(action: AgentAction): action is AnswerAction;
export declare function isStructuredAnswerAction(action: AgentAction): action is StructuredAnswerAction;
export declare function errorAction(error: AgentBuilderAgentExecutionError): AgentErrorAction;
export declare function toolCallAction(toolCalls: ToolCall[], message?: string): ToolCallAction;
export declare function executeToolAction(toolResults: ToolCallResult[]): ExecuteToolAction;
export declare function toolPromptAction(toolCallId: string, prompt: PromptRequest): ToolPromptAction;
export declare function handoverAction(message: string, forceful?: boolean): HandoverAction;
export declare function answerAction(message: string): AnswerAction;
export declare function structuredAnswerAction(data: object): StructuredAnswerAction;
