import type { ArchivePackage, RegistryPackage, PackageVerificationResult } from '../../../types';
export declare const getVerificationResult: (key: SharedKey) => PackageVerificationResult | undefined;
export declare const setVerificationResult: (key: SharedKey, value: PackageVerificationResult) => Map<string, PackageVerificationResult>;
export declare const hasVerificationResult: (key: SharedKey) => boolean;
export declare const clearVerificationResults: () => void;
export declare const deleteVerificationResult: (key: SharedKey) => boolean;
export interface SharedKey {
    name: string;
    version: string;
}
export declare const getPackageInfo: (args: SharedKey) => RegistryPackage | ArchivePackage | undefined;
export declare const setPackageInfo: ({ name, version, packageInfo, }: SharedKey & {
    packageInfo: ArchivePackage | RegistryPackage;
}) => Map<string, RegistryPackage | ArchivePackage>;
export declare const deletePackageInfo: (args: SharedKey) => boolean;
