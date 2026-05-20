import type { BundledPackage, Installation } from '../../../types';
export declare function _purgeBundledPackagesCache(): void;
export declare function getBundledPackages(): Promise<BundledPackage[]>;
export declare function getBundledPackageForInstallation(installation: Installation): Promise<BundledPackage | undefined>;
export declare function getBundledPackageByPkgKey(pkgKey: string): Promise<BundledPackage | undefined>;
export declare function getBundledPackageByName(name: string): Promise<BundledPackage | undefined>;
