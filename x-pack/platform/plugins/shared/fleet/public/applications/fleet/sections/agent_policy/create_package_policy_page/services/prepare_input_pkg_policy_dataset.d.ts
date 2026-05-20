import type { NewPackagePolicy } from '../../../../types';
export declare function prepareInputPackagePolicyDataset(newPolicy: NewPackagePolicy): {
    policy: NewPackagePolicy;
    forceCreateNeeded: boolean;
};
