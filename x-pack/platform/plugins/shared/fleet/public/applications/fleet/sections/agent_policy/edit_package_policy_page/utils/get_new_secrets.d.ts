import type { PackageInfo, UpdatePackagePolicy } from '../../../../types';
export declare const getNewSecrets: ({ packageInfo, packagePolicy, }: {
    packageInfo: PackageInfo;
    packagePolicy: UpdatePackagePolicy;
}) => import("../../../../types").RegistryVarsEntry[];
