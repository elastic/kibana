import { ServerSentEventError } from '@kbn/sse-utils';
import { AgentExecutionErrorCode } from '../agents/execution_errors';
import type { ExecutionErrorMetaOf } from '../agents/execution_errors';
import type { HookExecutionMode, HookLifecycle } from '../hooks/lifecycle';
/**
 * Code to identify agentBuilder errors
 */
export declare enum AgentBuilderErrorCode {
    internalError = "internalError",
    badRequest = "badRequest",
    toolNotFound = "toolNotFound",
    skillNotFound = "skillNotFound",
    agentNotFound = "agentNotFound",
    conversationNotFound = "conversationNotFound",
    pluginNotFound = "pluginNotFound",
    agentExecutionError = "agentExecutionError",
    requestAborted = "requestAborted",
    hookExecutionError = "hookExecutionError",
    workflowAborted = "workflowAborted",
    workflowExecutionFailed = "workflowExecutionFailed"
}
/**
 * Base error class used for all agentBuilder errors.
 */
export type AgentBuilderError<TCode extends AgentBuilderErrorCode, TMeta extends Record<string, any> = Record<string, any>> = ServerSentEventError<TCode, TMeta>;
export type SerializedAgentBuilderError = ReturnType<AgentBuilderError<AgentBuilderErrorCode>['toJSON']>;
export declare const isAgentBuilderError: (err: unknown) => err is AgentBuilderError<AgentBuilderErrorCode>;
export declare const createAgentBuilderError: (errorCode: AgentBuilderErrorCode, message: string, meta?: Record<string, any>) => AgentBuilderError<AgentBuilderErrorCode>;
/**
 * Represents an internal error
 */
export type AgentBuilderInternalError = AgentBuilderError<AgentBuilderErrorCode.internalError>;
/**
 * Checks if the given error is a {@link AgentBuilderInternalError}
 */
export declare const isInternalError: (err: unknown) => err is AgentBuilderInternalError;
export declare const createInternalError: (message: string, meta?: Record<string, any>) => AgentBuilderInternalError;
/**
 * Represents a generic bad request error
 */
export type AgentBuilderBadRequestError = AgentBuilderError<AgentBuilderErrorCode.badRequest>;
/**
 * Checks if the given error is a {@link AgentBuilderInternalError}
 */
export declare const isBadRequestError: (err: unknown) => err is AgentBuilderBadRequestError;
export declare const createBadRequestError: (message: string, meta?: Record<string, any>) => AgentBuilderBadRequestError;
/**
 * Error thrown when trying to retrieve or execute a tool not present or available in the current context.
 */
export type AgentBuilderToolNotFoundError = AgentBuilderError<AgentBuilderErrorCode.toolNotFound>;
/**
 * Checks if the given error is a {@link AgentBuilderToolNotFoundError}
 */
export declare const isToolNotFoundError: (err: unknown) => err is AgentBuilderToolNotFoundError;
export declare const createToolNotFoundError: ({ toolId, customMessage, meta, }: {
    toolId: string;
    customMessage?: string;
    meta?: Record<string, any>;
}) => AgentBuilderToolNotFoundError;
/**
 * Error thrown when trying to retrieve a skill not present or available in the current context.
 */
export type AgentBuilderSkillNotFoundError = AgentBuilderError<AgentBuilderErrorCode.skillNotFound>;
/**
 * Checks if the given error is a {@link AgentBuilderSkillNotFoundError}
 */
export declare const isSkillNotFoundError: (err: unknown) => err is AgentBuilderSkillNotFoundError;
export declare const createSkillNotFoundError: ({ skillId, customMessage, meta, }: {
    skillId: string;
    customMessage?: string;
    meta?: Record<string, any>;
}) => AgentBuilderSkillNotFoundError;
/**
 * Error thrown when trying to retrieve or execute a tool not present or available in the current context.
 */
export type AgentBuilderAgentNotFoundError = AgentBuilderError<AgentBuilderErrorCode.agentNotFound>;
/**
 * Checks if the given error is a {@link AgentBuilderInternalError}
 */
export declare const isAgentNotFoundError: (err: unknown) => err is AgentBuilderAgentNotFoundError;
export declare const createAgentNotFoundError: ({ agentId, customMessage, meta, }: {
    agentId: string;
    customMessage?: string;
    meta?: Record<string, any>;
}) => AgentBuilderAgentNotFoundError;
/**
 * Error thrown when trying to retrieve or execute a tool not present or available in the current context.
 */
export type AgentBuilderConversationNotFoundError = AgentBuilderError<AgentBuilderErrorCode.conversationNotFound>;
/**
 * Checks if the given error is a {@link AgentBuilderConversationNotFoundError}
 */
export declare const isConversationNotFoundError: (err: unknown) => err is AgentBuilderConversationNotFoundError;
export declare const createConversationNotFoundError: ({ conversationId, customMessage, meta, }: {
    conversationId: string;
    customMessage?: string;
    meta?: Record<string, any>;
}) => AgentBuilderConversationNotFoundError;
/**
 * Error thrown when trying to retrieve a plugin not present in the current context.
 */
export type AgentBuilderPluginNotFoundError = AgentBuilderError<AgentBuilderErrorCode.pluginNotFound>;
/**
 * Checks if the given error is a {@link AgentBuilderPluginNotFoundError}
 */
export declare const isPluginNotFoundError: (err: unknown) => err is AgentBuilderPluginNotFoundError;
export declare const createPluginNotFoundError: ({ pluginId, customMessage, meta, }: {
    pluginId: string;
    customMessage?: string;
    meta?: Record<string, any>;
}) => AgentBuilderPluginNotFoundError;
/**
 * Represents an internal error
 */
export type AgentBuilderRequestAbortedError = AgentBuilderError<AgentBuilderErrorCode.requestAborted>;
/**
 * Checks if the given error is a {@link AgentBuilderRequestAbortedError}
 */
export declare const isRequestAbortedError: (err: unknown) => err is AgentBuilderRequestAbortedError;
export declare const createRequestAbortedError: (message: string, meta?: Record<string, any>) => AgentBuilderRequestAbortedError;
/**
 * Represents execution aborted by a workflow.
 */
export type AgentBuilderWorkflowAbortedError = AgentBuilderError<AgentBuilderErrorCode.workflowAborted>;
/**
 * Checks if the given error is a {@link AgentBuilderWorkflowAbortedError}
 */
export declare const isWorkflowAbortedError: (err: unknown) => err is AgentBuilderWorkflowAbortedError;
/**
 * Represents an unexpected error in the workflow execution.
 */
export declare const createWorkflowAbortedError: (message: string, meta?: {
    workflow?: string;
}) => AgentBuilderWorkflowAbortedError;
/**
 * Represents a workflow execution failure (workflow ran but finished with status FAILED).
 */
export type AgentBuilderWorkflowExecutionError = AgentBuilderError<AgentBuilderErrorCode.workflowExecutionFailed>;
/**
 * Checks if the given error is a {@link AgentBuilderWorkflowExecutionError}
 */
export declare const isWorkflowExecutionError: (err: unknown) => err is AgentBuilderWorkflowExecutionError;
/**
 * Creates an error when a workflow execution fails (e.g. step error, timeout).
 */
export declare const createWorkflowExecutionError: (message: string, meta?: {
    workflow?: string;
}) => AgentBuilderWorkflowExecutionError;
/**
 * Represents an error related to agent execution
 */
export type AgentBuilderAgentExecutionError<ErrCode extends AgentExecutionErrorCode = AgentExecutionErrorCode> = AgentBuilderError<AgentBuilderErrorCode.agentExecutionError, {
    errCode: ErrCode;
} & ExecutionErrorMetaOf<ErrCode>>;
/**
 * Checks if the given error is a {@link AgentBuilderInternalError}
 */
export declare const isAgentExecutionError: (err: unknown) => err is AgentBuilderAgentExecutionError;
export declare const createAgentExecutionError: <ErrCode extends AgentExecutionErrorCode>(message: string, code: ErrCode, meta: ExecutionErrorMetaOf<ErrCode>) => AgentBuilderAgentExecutionError<ErrCode>;
/**
 * Checks if the given error is a context length exceeded error
 */
export declare const isContextLengthExceededAgentError: (err: unknown) => err is AgentBuilderAgentExecutionError<AgentExecutionErrorCode.contextLengthExceeded>;
/**
 * Represents an error related to hook execution
 */
export type AgentBuilderHooksExecutionError = AgentBuilderError<AgentBuilderErrorCode.hookExecutionError>;
export declare const createHooksExecutionError: (message: string, hookLifecycle: HookLifecycle, hookId: string, hookMode: HookExecutionMode, meta?: Record<string, any>) => AgentBuilderHooksExecutionError;
/**
 * Checks if the given error is a {@link AgentBuilderHooksExecutionError}
 */
export declare const isHooksExecutionError: (err: unknown) => err is AgentBuilderHooksExecutionError;
/**
 * Global utility exposing all error utilities from a single export.
 */
export declare const AgentBuilderErrorUtils: {
    isAgentBuilderError: (err: unknown) => err is AgentBuilderError<AgentBuilderErrorCode>;
    isInternalError: (err: unknown) => err is AgentBuilderInternalError;
    isToolNotFoundError: (err: unknown) => err is AgentBuilderToolNotFoundError;
    isSkillNotFoundError: (err: unknown) => err is AgentBuilderSkillNotFoundError;
    isAgentNotFoundError: (err: unknown) => err is AgentBuilderAgentNotFoundError;
    isConversationNotFoundError: (err: unknown) => err is AgentBuilderConversationNotFoundError;
    isPluginNotFoundError: (err: unknown) => err is AgentBuilderPluginNotFoundError;
    isWorkflowAbortedError: (err: unknown) => err is AgentBuilderWorkflowAbortedError;
    isWorkflowExecutionError: (err: unknown) => err is AgentBuilderWorkflowExecutionError;
    isAgentExecutionError: (err: unknown) => err is AgentBuilderAgentExecutionError;
    isContextLengthExceededAgentError: (err: unknown) => err is AgentBuilderAgentExecutionError<AgentExecutionErrorCode.contextLengthExceeded>;
    createInternalError: (message: string, meta?: Record<string, any>) => AgentBuilderInternalError;
    createToolNotFoundError: ({ toolId, customMessage, meta, }: {
        toolId: string;
        customMessage?: string;
        meta?: Record<string, any>;
    }) => AgentBuilderToolNotFoundError;
    createSkillNotFoundError: ({ skillId, customMessage, meta, }: {
        skillId: string;
        customMessage?: string;
        meta?: Record<string, any>;
    }) => AgentBuilderSkillNotFoundError;
    createAgentNotFoundError: ({ agentId, customMessage, meta, }: {
        agentId: string;
        customMessage?: string;
        meta?: Record<string, any>;
    }) => AgentBuilderAgentNotFoundError;
    createConversationNotFoundError: ({ conversationId, customMessage, meta, }: {
        conversationId: string;
        customMessage?: string;
        meta?: Record<string, any>;
    }) => AgentBuilderConversationNotFoundError;
    createPluginNotFoundError: ({ pluginId, customMessage, meta, }: {
        pluginId: string;
        customMessage?: string;
        meta?: Record<string, any>;
    }) => AgentBuilderPluginNotFoundError;
    createWorkflowAbortedError: (message: string, meta?: {
        workflow?: string;
    }) => AgentBuilderWorkflowAbortedError;
    createWorkflowExecutionError: (message: string, meta?: {
        workflow?: string;
    }) => AgentBuilderWorkflowExecutionError;
    createAgentExecutionError: <ErrCode extends AgentExecutionErrorCode>(message: string, code: ErrCode, meta: ExecutionErrorMetaOf<ErrCode>) => AgentBuilderAgentExecutionError<ErrCode>;
    createHooksExecutionError: (message: string, hookLifecycle: HookLifecycle, hookId: string, hookMode: HookExecutionMode, meta?: Record<string, any>) => AgentBuilderHooksExecutionError;
    isHooksExecutionError: (err: unknown) => err is AgentBuilderHooksExecutionError;
};
