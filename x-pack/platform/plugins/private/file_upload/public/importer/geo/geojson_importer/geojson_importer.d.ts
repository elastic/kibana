import type { Feature } from 'geojson';
import type { ImportFailure } from '@kbn/file-upload-common';
import { AbstractGeoFileImporter } from '../abstract_geo_file_importer';
export declare const GEOJSON_FILE_TYPES: string[];
export declare class GeoJsonImporter extends AbstractGeoFileImporter {
    private _iterator?;
    private _prevBatchLastFeature?;
    protected _readNext(prevTotalFeaturesRead: number, prevTotalBytesRead: number): Promise<{
        bytesRead: number;
        features: Feature[];
        geometryTypesMap: Map<string, boolean>;
        invalidFeatures: ImportFailure[];
        hasNext: boolean;
    }>;
}
