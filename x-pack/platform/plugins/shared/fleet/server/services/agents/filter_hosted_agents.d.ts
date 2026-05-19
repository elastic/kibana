import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
export declare function filterHostedPolicies(soClient: SavedObjectsClientContract, givenAgents: Agent[], outgoingErrors: Record<Agent['id'], Error>, errorMessage: string): Promise<Agent[]>;
