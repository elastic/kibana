import type { AgentName } from '@kbn/elastic-agent-utils';
export type { ElasticAgentName, OpenTelemetryAgentName, AgentName } from '@kbn/elastic-agent-utils';
export interface Agent {
    ephemeral_id?: string;
    name: AgentName;
    version?: string;
}
