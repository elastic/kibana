import type { ArchivePackage } from '../../../../../../common';
import type { CustomPackageDatasetConfiguration } from '../../install';
export type AssetOptions = ArchivePackage & {
    kibanaVersion: string;
    datasets: CustomPackageDatasetConfiguration[];
};
export declare const createAssets: (assetOptions: AssetOptions) => {
    path: string;
    content: Buffer<ArrayBuffer>;
}[];
