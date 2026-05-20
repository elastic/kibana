import type { SavedObject } from '@kbn/core/server';
import type { AgentPolicy, AgentPolicySOAttributes, PackagePolicy } from '../../types';
export declare const PENDING_MIGRATION_TIMEOUT: number;
/**
 * Return true if user optin for the space awareness feature.
 */
export declare function isSpaceAwarenessEnabled(): Promise<boolean>;
/**
 * Return true if space awareness migration is currently running
 */
export declare function isSpaceAwarenessMigrationPending(): Promise<boolean>;
export declare function getSpaceForAgentPolicy(agentPolicy: Pick<AgentPolicy, 'space_ids'>): string;
export declare function getSpaceForAgentPolicySO(agentPolicySO: Pick<SavedObject<AgentPolicySOAttributes>, 'namespaces'>): string;
export declare function getSpaceForPackagePolicy(packagePolicy: Pick<PackagePolicy, 'spaceIds'>): string;
export declare function getSpaceForPackagePolicySO(packagePolicySO: Pick<SavedObject<AgentPolicySOAttributes>, 'namespaces'>): string;
export declare function getValidSpaceId(spacedIds?: string[]): string;
