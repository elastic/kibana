import type { AgentStatus, SimplifiedAgentStatus } from '../types';
export declare function agentStatusesToSummary(statuses: Record<AgentStatus, number>): Record<SimplifiedAgentStatus, number>;
