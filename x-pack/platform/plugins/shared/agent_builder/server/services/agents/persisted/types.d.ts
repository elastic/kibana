import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentRef } from '../../../../common/http_api/tools';
export type PersistedAgentDefinition = Omit<AgentDefinition, 'readonly'>;
export interface AgentsUsingToolsResult {
    agents: AgentRef[];
}
