import React from 'react';
import type { Feature } from 'geojson';
import { NdjsonReader } from '@kbn/file-upload-common';
import type { ImportFailure } from '@kbn/file-upload-common';
import { AbstractGeoFileImporter } from '../abstract_geo_file_importer';
export declare const SHAPEFILE_TYPES: string[];
export declare class ShapefileImporter extends AbstractGeoFileImporter {
    private _tableRowCount;
    private _dbfFile;
    private _prjFile;
    private _shxFile;
    private _iterator?;
    protected _reader: NdjsonReader;
    constructor(file: File);
    canPreview(): boolean;
    getSidecarFiles(): File[];
    renderEditor(onChange: () => void): React.JSX.Element | null;
    private _setTableRowCount;
    protected _getProgress(featuresProcessed: number, bytesProcessed: number): number;
    protected _readNext(prevTotalFeaturesRead: number, prevTotalBytesRead: number): Promise<{
        bytesRead: number;
        features: Feature[];
        geometryTypesMap: Map<string, boolean>;
        invalidFeatures: ImportFailure[];
        hasNext: boolean;
    }>;
}
