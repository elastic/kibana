import type { AgentsServiceStartContract } from '@kbn/agent-builder-browser';
import type { AgentService } from './agents_service';
export declare const createPublicAgentsContract: ({ agentService, }: {
    agentService: AgentService;
}) => AgentsServiceStartContract;
