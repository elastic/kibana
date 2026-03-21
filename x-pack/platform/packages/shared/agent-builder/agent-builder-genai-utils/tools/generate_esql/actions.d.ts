import type { BaseMessageLike } from '@langchain/core/messages';
import type { EsqlResponse } from '../utils/esql';
export interface RequestDocumentationAction {
    type: 'request_documentation';
    requestedKeywords: string[];
    fetchedDoc: Record<string, string>;
}
export interface GenerateQueryAction {
    type: 'generate_query';
    success: boolean;
    query?: string;
    response: string;
}
export interface AutocorrectQueryAction {
    type: 'autocorrect_query';
    wasCorrected: boolean;
    input: string;
    output: string;
}
export interface ExecuteQueryAction {
    type: 'execute_query';
    query: string;
    success: boolean;
    results?: EsqlResponse;
    error?: string;
}
export interface ValidateQueryAction {
    type: 'validate_query';
    query: string;
    success: boolean;
    error?: string;
}
export type Action = RequestDocumentationAction | GenerateQueryAction | AutocorrectQueryAction | ExecuteQueryAction | ValidateQueryAction;
export declare function isRequestDocumentationAction(action: Action): action is RequestDocumentationAction;
export declare function isGenerateQueryAction(action: Action): action is GenerateQueryAction;
export declare function isAutocorrectQueryAction(action: Action): action is AutocorrectQueryAction;
export declare function isExecuteQueryAction(action: Action): action is ExecuteQueryAction;
export declare function isValidateQueryAction(action: Action): action is ValidateQueryAction;
/**
 * Format an action into a couple of [ai, user] messages to be used in prompts.
 */
export declare const formatAction: (action: Action, withoutToolCalls?: boolean) => BaseMessageLike[];
