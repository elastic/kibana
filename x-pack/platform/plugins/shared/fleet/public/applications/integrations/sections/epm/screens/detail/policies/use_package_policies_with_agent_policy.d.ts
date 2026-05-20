import type { PackagePolicy, GetAgentPoliciesResponseItem, GetPackagePoliciesResponse } from '../../../../../types';
import type { useGetPackagePolicies } from '../../../../../hooks';
export interface PackagePolicyAndAgentPolicy {
    packagePolicy: PackagePolicy;
    agentPolicies: GetAgentPoliciesResponseItem[];
}
type GetPackagePoliciesWithAgentPolicy = Omit<GetPackagePoliciesResponse, 'items'> & {
    items: PackagePolicyAndAgentPolicy[];
};
/**
 * Works similar to `useGetAgentPolicies()`, except that it will add an additional property to
 * each package policy named `agentPolicies` which may hold the Agent Policies associated with the
 * given package policy.
 * @param query
 */
export declare const usePackagePoliciesWithAgentPolicy: (query: Parameters<typeof useGetPackagePolicies>[0]) => {
    isLoading: boolean;
    error: Error | null;
    data?: GetPackagePoliciesWithAgentPolicy;
    resendRequest: () => void;
};
export {};
