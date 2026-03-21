import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { AgentHandlerContext } from '@kbn/agent-builder-server';
import type { RunAgentParams, RunAgentResponse } from '../run_agent';
export type RunChatAgentParams = Omit<RunAgentParams, 'mode'> & {
    browserApiTools?: BrowserApiToolMetadata[];
    startTime?: Date;
};
export type RunChatAgentFn = (params: RunChatAgentParams, context: AgentHandlerContext) => Promise<RunAgentResponse>;
/**
 * Create the handler function for the default agentBuilder agent.
 */
export declare const runDefaultAgentMode: RunChatAgentFn;
