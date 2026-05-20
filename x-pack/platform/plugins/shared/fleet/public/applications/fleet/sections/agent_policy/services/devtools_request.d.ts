import type { NewAgentPolicy, NewPackagePolicy, UpdatePackagePolicy, UpdateAgentPolicyRequest } from '../../../types';
/**
 * Generate a request to create an agent policy that can be used in Kibana Dev tools
 * @param agentPolicy
 * @param withSysMonitoring
 * @returns
 */
export declare function generateCreateAgentPolicyDevToolsRequest(agentPolicy: NewAgentPolicy, withSysMonitoring?: boolean): string;
/**
 * Generate a request to create a package policy that can be used in Kibana Dev tools
 * @param packagePolicy
 * @param withSysMonitoring
 * @returns
 */
export declare function generateCreatePackagePolicyDevToolsRequest(packagePolicy: NewPackagePolicy & {
    force?: boolean;
}): string;
export declare function generateCreateAgentlessPolicyDevToolsRequest(packagePolicy: NewPackagePolicy & {
    force?: boolean;
}): string;
/**
 * Generate a request to update a package policy that can be used in Kibana Dev tools
 * @param packagePolicyId
 * @param packagePolicy
 * @returns
 */
export declare function generateUpdatePackagePolicyDevToolsRequest(packagePolicyId: string, packagePolicy: UpdatePackagePolicy): string;
/**
 * Generate a request to update an agent policy that can be used in Kibana Dev tools
 * @param agentPolicyId
 * @param agentPolicy
 * @returns
 */
export declare function generateUpdateAgentPolicyDevToolsRequest(agentPolicyId: string, agentPolicy: UpdateAgentPolicyRequest['body']): string;
