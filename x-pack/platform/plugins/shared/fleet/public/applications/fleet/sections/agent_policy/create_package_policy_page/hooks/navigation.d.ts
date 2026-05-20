import type { CreatePackagePolicyRouteState, PackagePolicy, OnSaveQueryParamKeys } from '../../../../types';
import type { EditPackagePolicyFrom } from '../types';
interface UseCancelParams {
    from: EditPackagePolicyFrom;
    pkgkey: string;
    agentPolicyId?: string;
}
export declare const useCancelAddPackagePolicy: (params: UseCancelParams) => {
    cancelClickHandler: (ev: React.SyntheticEvent) => void;
    cancelUrl: string;
};
interface UseOnSaveNavigateParams {
    routeState?: CreatePackagePolicyRouteState;
    queryParamsPolicyId?: string;
}
export declare const useOnSaveNavigate: (params: UseOnSaveNavigateParams) => (policy: PackagePolicy, paramsToApply?: OnSaveQueryParamKeys[]) => void;
export {};
