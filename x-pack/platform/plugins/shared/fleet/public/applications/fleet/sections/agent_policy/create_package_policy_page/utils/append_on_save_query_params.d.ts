import type { CreatePackagePolicyRouteState, PackagePolicy, OnSaveQueryParamKeys } from '../../../../types';
export declare function appendOnSaveQueryParamsToPath({ path, policy, paramsToApply, mappingOptions, }: {
    path: string;
    policy: PackagePolicy;
    paramsToApply: OnSaveQueryParamKeys[];
    mappingOptions?: CreatePackagePolicyRouteState['onSaveQueryParams'];
}): string;
