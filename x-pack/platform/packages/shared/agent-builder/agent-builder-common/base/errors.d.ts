import { ServerSentEventError } from '@kbn/sse-utils';
import { AgentExecutionErrorCode } from '../agents/execution_errors';
import type { ExecutionErrorMetaOf } from '../agents/execution_errors';
import type { HookExecutionMode, HookLifecycle } from '../hooks/lifecycle';
import type { SerializedExecutionError } from '../agents/execution_status';
/**
 * Code to identify agentBuilder errors
 */
export declare enum AgentBuilderErrorCode {
    internalError = "internalError",
    badRequest = "badRequest",
    forbidden = "forbidden",
    toolNotFound = "toolNotFound",
    skillNotFound = "skillNotFound",
    agentNotFound = "agentNotFound",
    agentUnavailable = "agentUnavailable",
    conversationNotFound = "conversationNotFound",
    conversationWriteConflict = "conversationWriteConflict",
    conversationAlreadyExists = "conversationAlreadyExists",
    pluginNotFound = "pluginNotFound",
    agentExecutionError = "agentExecutionError",
    requestAborted = "requestAborted",
    hookExecutionError = "hookExecutionError",
    workflowAborted = "workflowAborted",
    workflowExecutionFailed = "workflowExecutionFailed",
    attachmentNotFound = "attachmentNotFound",
    attachmentAlreadyExists = "attachmentAlreadyExists",
    attachmentPermanentDeleteBlocked = "attachmentPermanentDeleteBlocked",
    attachmentInvalid = "attachmentInvalid"
}
/**
 * Base error class used for all agentBuilder errors.
 */
export type AgentBuilderError<TCode extends AgentBuilderErrorCode, TMeta extends Record<string, any> = Record<string, any>> = ServerSentEventError<TCode, TMeta>;
export type SerializedAgentBuilderError = ReturnType<AgentBuilderError<AgentBuilderErrorCode>['toJSON']>;
export declare const isAgentBuilderError: (err: unknown) => err is AgentBuilderError<AgentBuilderErrorCode>;
export declare const createAgentBuilderError: (errorCode: AgentBuilderErrorCode, message: string, meta?: Record<string, any>) => AgentBuilderError<AgentBuilderErrorCode>;
/**
 * Rebuilds an `AgentBuilderError` from its serialized form, including the `cause` chain, so that
 * re-serializing it loses nothing and the error type guards keep working.
 */
export declare const deserializeExecutionError: (serialized: SerializedExecutionError) => AgentBuilderError<AgentBuilderErrorCode>;
/**
 * Represents an internal error
 */
export type AgentBuilderInternalError = AgentBuilderError<AgentBuilderErrorCode.internalError>;
/**
 * Checks if the given error is a {@link AgentBuilderInternalError}
 */
export declare const isInternalError: (err: unknown) => err is AgentBuilderInternalError;
export declare const createInternalError: (message: string, meta?: Record<string, any>, { cause }?: {
    cause?: unknown;
}) => AgentBuilderInternalError;
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
 * Represents a forbidden error (the caller lacks the required privileges).
 */
export type AgentBuilderForbiddenError = AgentBuilderError<AgentBuilderErrorCode.forbidden>;
/**
 * Checks if the given error is a {@link AgentBuilderForbiddenError}
 */
export declare const isForbiddenError: (err: unknown) => err is AgentBuilderForbiddenError;
export declare const createForbiddenError: (message: string, meta?: Record<string, any>) => AgentBuilderForbiddenError;
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
 * Error thrown when trying to retrieve an agent not present in the current context.
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
 * Error thrown when trying to retrieve an agent that exists but is not currently available.
 */
export type AgentBuilderAgentUnavailableError = AgentBuilderError<AgentBuilderErrorCode.agentUnavailable>;
export declare const isAgentUnavailableError: (err: unknown, _agentId?: string) => err is AgentBuilderAgentUnavailableError;
export declare const createAgentUnavailableError: ({ agentId, customMessage, meta, }: {
    agentId: string;
    customMessage?: string;
    meta?: Record<string, any>;
}) => AgentBuilderAgentUnavailableError;
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
 * Error thrown when concurrent writes to a conversation could not be reconciled.
 */
export type AgentBuilderConversationWriteConflictError = AgentBuilderError<AgentBuilderErrorCode.conversationWriteConflict>;
/**
 * Checks if the given error is a {@link AgentBuilderConversationWriteConflictError}
 */
export declare const isConversationWriteConflictError: (err: unknown) => err is AgentBuilderConversationWriteConflictError;
export declare const createConversationWriteConflictError: ({ conversationId, meta, }: {
    conversationId: string;
    meta?: Record<string, any>;
}) => AgentBuilderConversationWriteConflictError;
/**
 * Error thrown when a conversation with the given ID already exists.
 */
export type AgentBuilderConversationAlreadyExistsError = AgentBuilderError<AgentBuilderErrorCode.conversationAlreadyExists>;
/**
 * Checks if the given error is a {@link AgentBuilderConversationAlreadyExistsError}
 */
export declare const isConversationAlreadyExistsError: (err: unknown) => err is AgentBuilderConversationAlreadyExistsError;
export declare const createConversationAlreadyExistsError: ({ conversationId, meta, }: {
    conversationId: string;
    meta?: Record<string, any>;
}) => AgentBuilderConversationAlreadyExistsError;
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
 * Error thrown when a conversation attachment cannot be found.
 */
export type AgentBuilderAttachmentNotFoundError = AgentBuilderError<AgentBuilderErrorCode.attachmentNotFound>;
export declare const isAttachmentNotFoundError: (err: unknown) => err is AgentBuilderAttachmentNotFoundError;
export declare const createAttachmentNotFoundError: ({ attachmentId, customMessage, meta, }: {
    attachmentId: string;
    customMessage?: string;
    meta?: Record<string, any>;
}) => AgentBuilderAttachmentNotFoundError;
/**
 * Error thrown when creating an attachment whose id already exists on the conversation.
 */
export type AgentBuilderAttachmentAlreadyExistsError = AgentBuilderError<AgentBuilderErrorCode.attachmentAlreadyExists>;
export declare const isAttachmentAlreadyExistsError: (err: unknown) => err is AgentBuilderAttachmentAlreadyExistsError;
export declare const createAttachmentAlreadyExistsError: ({ attachmentId, meta, }: {
    attachmentId: string;
    meta?: Record<string, any>;
}) => AgentBuilderAttachmentAlreadyExistsError;
/**
 * Error thrown when an attachment cannot be permanently deleted because it is
 * still referenced (either by client_id / flyout configuration or by prior
 * conversation rounds).
 */
export type AgentBuilderAttachmentPermanentDeleteBlockedError = AgentBuilderError<AgentBuilderErrorCode.attachmentPermanentDeleteBlocked, {
    reason: 'client_id' | 'referenced_in_rounds';
    attachmentId: string;
    statusCode: number;
}>;
export declare const isAttachmentPermanentDeleteBlockedError: (err: unknown) => err is AgentBuilderAttachmentPermanentDeleteBlockedError;
export declare const createAttachmentPermanentDeleteBlockedError: ({ attachmentId, reason, meta, }: {
    attachmentId: string;
    reason: 'client_id' | 'referenced_in_rounds';
    meta?: Record<string, any>;
}) => AgentBuilderAttachmentPermanentDeleteBlockedError;
/**
 * Error thrown when attachment input fails validation or when an operation is
 * attempted against an attachment in an invalid state (e.g. updating a soft-
 * deleted attachment, deleting a screen_context attachment).
 */
export type AgentBuilderAttachmentInvalidError = AgentBuilderError<AgentBuilderErrorCode.attachmentInvalid>;
export declare const isAttachmentInvalidError: (err: unknown) => err is AgentBuilderAttachmentInvalidError;
export declare const createAttachmentInvalidError: (message: string, meta?: Record<string, any>) => AgentBuilderAttachmentInvalidError;
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
    isAgentBuilderError: typeof isAgentBuilderError;
    isInternalError: typeof isInternalError;
    isForbiddenError: typeof isForbiddenError;
    isToolNotFoundError: typeof isToolNotFoundError;
    isSkillNotFoundError: typeof isSkillNotFoundError;
    isAgentNotFoundError: typeof isAgentNotFoundError;
    isAgentUnavailableError: typeof isAgentUnavailableError;
    isConversationNotFoundError: typeof isConversationNotFoundError;
    isConversationWriteConflictError: typeof isConversationWriteConflictError;
    isPluginNotFoundError: typeof isPluginNotFoundError;
    isWorkflowAbortedError: typeof isWorkflowAbortedError;
    isWorkflowExecutionError: typeof isWorkflowExecutionError;
    isAgentExecutionError: typeof isAgentExecutionError;
    isContextLengthExceededAgentError: typeof isContextLengthExceededAgentError;
    isAttachmentNotFoundError: typeof isAttachmentNotFoundError;
    isAttachmentAlreadyExistsError: typeof isAttachmentAlreadyExistsError;
    isAttachmentPermanentDeleteBlockedError: typeof isAttachmentPermanentDeleteBlockedError;
    isAttachmentInvalidError: typeof isAttachmentInvalidError;
    createInternalError: typeof createInternalError;
    createForbiddenError: typeof createForbiddenError;
    createToolNotFoundError: typeof createToolNotFoundError;
    createSkillNotFoundError: typeof createSkillNotFoundError;
    createAgentNotFoundError: typeof createAgentNotFoundError;
    createAgentUnavailableError: typeof createAgentUnavailableError;
    createConversationNotFoundError: typeof createConversationNotFoundError;
    createConversationWriteConflictError: typeof createConversationWriteConflictError;
    createPluginNotFoundError: typeof createPluginNotFoundError;
    createWorkflowAbortedError: typeof createWorkflowAbortedError;
    createWorkflowExecutionError: typeof createWorkflowExecutionError;
    createAgentExecutionError: typeof createAgentExecutionError;
    createHooksExecutionError: typeof createHooksExecutionError;
    isHooksExecutionError: typeof isHooksExecutionError;
    createAttachmentNotFoundError: typeof createAttachmentNotFoundError;
    createAttachmentAlreadyExistsError: typeof createAttachmentAlreadyExistsError;
    createAttachmentPermanentDeleteBlockedError: typeof createAttachmentPermanentDeleteBlockedError;
    createAttachmentInvalidError: typeof createAttachmentInvalidError;
};
