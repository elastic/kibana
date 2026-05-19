import type { Logger } from '@kbn/logging';
import type { AgentlessAgentService } from '../agents/agentless_agent';
export declare function syncAgentlessDeployments({ logger, agentlessAgentService, }: {
    logger: Logger;
    agentlessAgentService: AgentlessAgentService;
}, opts?: {
    dryRun?: boolean;
    abortController?: AbortController;
}): Promise<void>;
