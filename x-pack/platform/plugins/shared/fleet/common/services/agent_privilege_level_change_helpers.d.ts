import type { Agent, AgentPolicy } from '../types';
export declare const MINIMUM_PRIVILEGE_LEVEL_CHANGE_AGENT_VERSION = "9.3.0";
export declare const isAgentPrivilegeLevelChangeSupported: (agent: Agent) => boolean;
export declare const isAgentEligibleForPrivilegeLevelChange: (agent: Agent, agentPolicy?: AgentPolicy) => boolean;
