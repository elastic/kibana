import type { AgentHandlerFn } from '@kbn/agent-builder-server';
import type { InternalAgentDefinition } from '../agent_registry';
/**
 * Create the handler function for the default agentBuilder agent.
 */
export declare const createAgentHandler: ({ agent, }: {
    agent: InternalAgentDefinition;
}) => AgentHandlerFn;
