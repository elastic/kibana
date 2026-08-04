export declare enum AgentPromptType {
    confirmation = "confirmation",
    authorization = "authorization",
    ask_user_question = "ask_user_question"
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
export declare enum AuthorizationStatus {
    unprompted = "unprompted",
    authorized = "authorized",
    declined = "declined"
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
export declare const AUTHORIZATION_METHODS: readonly ["oauth_authorization_code", "ears"];
export type AuthorizationMethod = (typeof AUTHORIZATION_METHODS)[number];
export declare const isAuthorizationMethod: (value: unknown) => value is AuthorizationMethod;
export interface AuthorizationPromptDefinition {
    id: string;
    connector_id: string;
    connector_name: string;
    connector_type: string;
    auth_method: AuthorizationMethod;
}
export interface AskUserQuestionPromptDefinition {
    id: string;
    questions: AskUserQuestionItem[];
}
export interface AskUserQuestionItem {
    question: string;
    options: AskUserQuestionOption[];
    multi_select: boolean;
}
export interface AskUserQuestionOption {
    label: string;
    description?: string;
}
export interface AskUserQuestionAnswer {
    /** Selected option indices (in `questions[i].options`). For single-select questions: at most one entry. */
    choice?: number[];
    /** Free-text answer. Allowed alongside `choice`. */
    custom?: string;
    /** True when the user explicitly skipped this question. Mutually exclusive with `choice` / `custom`. */
    skipped?: boolean;
}
export interface ConfirmationPromptResponse {
    allow: boolean;
}
export interface AuthorizationPromptResponse {
    authorized: boolean;
}
export interface AskUserQuestionPromptResponse {
    answers: AskUserQuestionAnswer[];
}
export type PromptResponse = ConfirmationPromptResponse | AuthorizationPromptResponse | AskUserQuestionPromptResponse;
export declare const isConfirmationPromptResponse: (response: PromptResponse) => response is ConfirmationPromptResponse;
export declare const isAuthorizationPromptResponse: (response: PromptResponse) => response is AuthorizationPromptResponse;
export declare const isAskUserQuestionPromptResponse: (response: PromptResponse) => response is AskUserQuestionPromptResponse;
export interface ConfirmationPrompt extends ConfirmPromptDefinition {
    type: AgentPromptType.confirmation;
}
export interface AuthorizationPrompt extends AuthorizationPromptDefinition {
    type: AgentPromptType.authorization;
}
export interface AskUserQuestionPrompt extends AskUserQuestionPromptDefinition {
    type: AgentPromptType.ask_user_question;
}
export type PromptRequest = ConfirmationPrompt | AuthorizationPrompt | AskUserQuestionPrompt;
export declare const isConfirmationPrompt: (prompt: PromptRequest) => prompt is ConfirmationPrompt;
export declare const isAuthorizationPrompt: (prompt: PromptRequest) => prompt is AuthorizationPrompt;
export declare const isAskUserQuestionPrompt: (prompt: PromptRequest) => prompt is AskUserQuestionPrompt;
export interface ConfirmationPromptResponseState {
    type: AgentPromptType.confirmation;
    response: ConfirmationPromptResponse;
}
export interface AuthorizationPromptResponseState {
    type: AgentPromptType.authorization;
    response: AuthorizationPromptResponse;
}
export interface AskUserQuestionPromptResponseState {
    type: AgentPromptType.ask_user_question;
    response: AskUserQuestionPromptResponse;
}
export type PromptResponseState = ConfirmationPromptResponseState | AuthorizationPromptResponseState | AskUserQuestionPromptResponseState;
/**
 * The internal representation of the prompt storage state for the conversation.
 */
export interface PromptStorageState {
    responses: Record<string, PromptResponseState>;
}
