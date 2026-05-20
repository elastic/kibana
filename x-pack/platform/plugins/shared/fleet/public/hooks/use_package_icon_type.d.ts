import type { PackageInfo, PackageListItem } from '../types';
type Package = PackageInfo | PackageListItem;
export interface UsePackageIconType {
    packageName: string;
    integrationName?: string;
    version: Package['version'];
    icons?: Package['icons'];
    tryApi?: boolean;
}
export declare const usePackageIconType: ({ packageName, integrationName, version, icons: paramIcons, tryApi, }: UsePackageIconType) => string;
export {};
