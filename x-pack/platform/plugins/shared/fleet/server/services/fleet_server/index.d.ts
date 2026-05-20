import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy } from '../../../common/types';
/**
 * Retrieve all agent policies which has a Fleet Server package policy
 */
export declare const getFleetServerPolicies: (soClient: SavedObjectsClientContract) => Promise<AgentPolicy[]>;
/**
 * Check if there is at least one agent enrolled into the given agent policies.
 * Assumes that `agentPolicyIds` contains list of Fleet Server agent policies.
 * `activeOnly` flag can be used to filter only active agents.
 */
export declare const hasFleetServersForPolicies: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentPolicies: Array<Pick<AgentPolicy, "id" | "space_ids">>, activeOnly?: boolean) => Promise<boolean>;
/**
 * Check if at least one fleet server agent exists, regardless of its online status
 */
export declare function hasFleetServers(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<boolean>;
/**
 * This function checks if all Fleet Server agents are running at least a given version, but with
 * some important caveats related to enabling the secrets storage feature:
 *
 * 1. Any unenrolled agents are ignored if they are running an outdated version
 * 2. Managed agents in an inactive state are ignored if they are running an outdated version.
 */
export declare function checkFleetServerVersionsForSecretsStorage(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, version: string): Promise<boolean>;
