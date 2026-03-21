import type { AgentBuilderAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
/**
 * Converts an error which occurred during the execution of the agent to our error format,
 * leveraging the errors which are already processed by the inference plugin for some of them.
 * Also categorizes the error to identifiable error codes.
 */
export declare const convertError: (error: Error) => AgentBuilderAgentExecutionError;
export declare const isRecoverableError: (error: AgentBuilderAgentExecutionError) => boolean;
