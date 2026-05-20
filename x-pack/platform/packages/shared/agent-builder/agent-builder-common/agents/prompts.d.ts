export declare enum AgentPromptType {
    confirmation = "confirmation"
}
export declare enum AgentPromptRequestSourceType {
    toolCall = "tool_call"
}
export interface ToolCallPromptRequestSource {
    type: AgentPromptRequestSourceType.toolCall;
    tool_call_id: string;
}
export type PromptRequestSource = ToolCallPromptRequestSource;
export declare enum ConfirmationStatus {
    /**
     * the confirmation for the given ID wasn't prompted to the user yet
     */
    unprompted = "unprompted",
    /**
     * The user confirmed the prompt
     */
    accepted = "accepted",
    /**
     * The user declined the prompt
     */
    rejected = "rejected"
}
export type ConfirmPromptColor = 'primary' | 'warning' | 'danger';
export interface ConfirmPromptDefinition {
    /** id of the permission to ask confirmation for */
    id: string;
    /** optional title to display for the confirmation prompt */
    title?: string;
    /** optional markdown body to display in the confirmation prompt */
    message?: string;
    /** optional text to display for the confirmation prompt's confirm button */
    confirm_text?: string;
    /** optional text to display for the confirmation prompt's cancel button */
    cancel_text?: string;
    /** visual color theme for the confirmation card (default: 'warning') */
    color?: ConfirmPromptColor;
}
export interface ConfirmationPromptResponse {
    allow: boolean;
}
export type PromptResponse = ConfirmationPromptResponse;
export interface ConfirmationPrompt extends ConfirmPromptDefinition {
    type: AgentPromptType.confirmation;
}
export type PromptRequest = ConfirmationPrompt;
export declare const isConfirmationPrompt: (prompt: PromptRequest) => prompt is ConfirmationPrompt;
export interface ConfirmationPromptResponseState {
    type: AgentPromptType.confirmation;
    response: ConfirmationPromptResponse;
}
export type PromptResponseState = ConfirmationPromptResponseState;
/**
 * The internal representation of the prompt storage state for the conversation.
 */
export interface PromptStorageState {
    responses: Record<string, PromptResponseState>;
}
