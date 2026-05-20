import type { PackageInfo, PackageListItem } from '../../common';
export declare const getDeferredInstallationsCnt: (pkg?: PackageInfo | PackageListItem | null) => number;
export declare const hasDeferredInstallations: (pkg?: PackageInfo | PackageListItem | null) => boolean;
