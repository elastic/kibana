import type { Agent, AgentPolicy } from '../types';
export declare const MINIMUM_MIGRATE_AGENT_VERSION = "9.2.0";
export declare const isAgentMigrationSupported: (agent: Agent) => boolean;
export declare const isAgentEligibleForMigration: (agent: Agent, agentPolicy?: AgentPolicy) => boolean;
