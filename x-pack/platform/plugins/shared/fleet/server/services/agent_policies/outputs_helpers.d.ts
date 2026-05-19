import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicySOAttributes, AgentPolicy, PackagePolicy } from '../../types';
/**
 * Get the data output for a given agent policy
 * @param soClient
 * @param agentPolicy
 * @returns
 */
export declare function getDataOutputForAgentPolicy(soClient: SavedObjectsClientContract, agentPolicy: Partial<AgentPolicySOAttributes>): Promise<import("../../types").Output>;
/**
 * Validate outputs are valid for a policy using the current kibana licence or throw.
 * @returns
 * @param soClient
 * @param newData
 * @param existingData
 * @param allowedOutputTypeForPolicy
 */
export declare function validateOutputForPolicy(soClient: SavedObjectsClientContract, newData: Partial<AgentPolicySOAttributes>, existingData?: Partial<AgentPolicySOAttributes>, allowedOutputTypeForPolicy?: string[]): Promise<void>;
export declare function validateAgentPolicyOutputForIntegration(soClient: SavedObjectsClientContract, agentPolicy: AgentPolicy, packagePolicy: Pick<PackagePolicy, 'supports_agentless'>, packageName: string, isNewPackagePolicy?: boolean): Promise<void>;
