import type { NewPackagePolicy, PackageInfo } from '../../../../../types';
export declare const sendGeneratePackagePolicy: (agentPolicyId: string, packageInfo: PackageInfo, integrationToEnable?: string) => Promise<{
    packagePolicy: NewPackagePolicy;
    error: import("../../../../../hooks").RequestError | null;
}>;
