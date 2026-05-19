import type { estypes } from '@elastic/elasticsearch';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SearchHit } from '@kbn/es-types';
import type { Agent, AgentSOAttributes, AgentStatus, FleetServerAgent } from '../../types';
type FleetServerAgentESResponse = estypes.GetGetResult<FleetServerAgent> | estypes.SearchResponse<FleetServerAgent>['hits']['hits'][0] | SearchHit<FleetServerAgent>;
export declare function searchHitToAgent(hit: FleetServerAgentESResponse & {
    sort?: SortResults;
    fields?: {
        status?: AgentStatus[];
    };
}): Agent;
export declare function agentSOAttributesToFleetServerAgentDoc(data: Partial<AgentSOAttributes>): Partial<Omit<FleetServerAgent, 'id'>>;
export {};
