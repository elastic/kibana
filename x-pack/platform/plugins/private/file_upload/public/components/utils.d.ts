import type { GeoFileImporter } from '../importer/geo/types';
export declare function getPartialImportMessage(failedFeaturesCount: number, totalFeaturesCount?: number): string;
export declare function hasSidecarFiles(importer: GeoFileImporter | null | undefined): importer is GeoFileImporter & {
    getSidecarFiles(): File[];
};
