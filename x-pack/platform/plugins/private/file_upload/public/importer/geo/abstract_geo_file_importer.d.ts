import type { ReactNode } from 'react';
import type { Feature } from 'geojson';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { NdjsonReader } from '@kbn/file-upload-common';
import type { CreateDocsResponse, ImportDoc, ImportFailure, ImportResults } from '@kbn/file-upload-common';
import type { GeoFileImporter, GeoFilePreview } from './types';
import { Importer } from '../importer';
export declare class AbstractGeoFileImporter extends Importer implements GeoFileImporter {
    private _file;
    private _isActive;
    private _hasNext;
    private _features;
    private _totalBytesRead;
    private _totalBytesImported;
    private _blockSizeInBytes;
    private _totalFeaturesRead;
    private _totalFeaturesImported;
    private _totalFeaturesSent;
    private _geometryTypesMap;
    private _invalidFeatures;
    private _importFailures;
    private _geoFieldType;
    private _smallChunks;
    protected _reader: NdjsonReader;
    constructor(file: File);
    destroy(): void;
    getCurrentImportStats(): {
        docCount: number;
        failures: ImportFailure[];
    };
    canPreview(): boolean;
    renderEditor(onChange: () => void): ReactNode;
    previewFile(rowLimit?: number, sizeLimit?: number): Promise<GeoFilePreview>;
    setGeoFieldType(geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE): void;
    setSmallChunks(smallChunks: boolean): void;
    import(index: string, pipelineId: string, setImportProgress: (progress: number) => void): Promise<ImportResults>;
    private _importBlock;
    private _readUntil;
    protected _readNext(prevFeaturesRead: number, prevBytesRead: number): Promise<{
        bytesRead: number;
        features: Feature[];
        geometryTypesMap: Map<string, boolean>;
        invalidFeatures: ImportFailure[];
        hasNext: boolean;
    }>;
    protected _getProgress(featuresProcessed: number, bytesProcessed: number): number;
    protected _getIsActive(): boolean;
    protected _getFile(): File;
    read(data: ArrayBuffer): {
        success: boolean;
    };
    protected _createDocs(text: string): CreateDocsResponse<ImportDoc>;
}
