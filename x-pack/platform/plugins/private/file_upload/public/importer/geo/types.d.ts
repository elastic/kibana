import type { Feature } from 'geojson';
import type { ReactNode } from 'react';
import type { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { ImportFailure } from '@kbn/file-upload-common';
import type { IImporter } from '../types';
export interface GeoFilePreview {
    features: Feature[];
    hasPoints: boolean;
    hasShapes: boolean;
    invalidFeatures: ImportFailure[];
    previewCoverage: number;
}
export interface GeoFileImporter extends IImporter {
    destroy(): void;
    canPreview(): boolean;
    previewFile(rowLimit?: number, sizeLimit?: number): Promise<GeoFilePreview>;
    renderEditor(onChange: () => void): ReactNode;
    setGeoFieldType(geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE): void;
    setSmallChunks(smallChunks: boolean): void;
    getCurrentImportStats(): {
        docCount: number;
        failures: ImportFailure[];
    };
    getSidecarFiles?(): File[];
}
