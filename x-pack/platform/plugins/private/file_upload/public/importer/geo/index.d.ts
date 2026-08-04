import type { GeoFileImporter } from './types';
export declare const GEO_FILE_TYPES: string[];
export declare function geoImporterFactory(file: File): GeoFileImporter;
export type { GeoFileImporter, GeoFilePreview } from './types';
