import type { ArchiveEntry } from '../../../../common/types';
import type { AssetsMap, PackageInfo } from '../../../types';
export declare function getAssetsFromAssetsMap(packageInfo: Pick<PackageInfo, 'version' | 'name' | 'type'>, assetsMap: AssetsMap, filter?: (path: string) => boolean, datasetName?: string): string[];
export declare function getAssetsDataFromAssetsMap(packageInfo: Pick<PackageInfo, 'version' | 'name' | 'type'>, assetsMap: AssetsMap, filter?: (path: string) => boolean, datasetName?: string): ArchiveEntry[];
