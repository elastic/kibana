import type { PackageDependencies } from '../../../../common/types';
import type { InstallablePackage } from '../../../../common';
export declare function getPackageDependencies(packageInfo: InstallablePackage): PackageDependencies | null;
export declare function mergeIsDependencyOf(installedAsDependencyOf?: {
    name: string;
    version: string;
}, existingIsDependencyOf?: {
    name: string;
    version: string;
}[]): {
    name: string;
    version: string;
}[];
