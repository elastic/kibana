import type React from 'react';
import type { FeatureCollection } from 'geojson';
import type { HttpStart, AnalyticsServiceStart } from '@kbn/core/public';
import type { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { ImportFactoryOptions } from '@kbn/file-upload-common';
import type { IImporter } from '../importer';
import type { IndexNameFormProps } from '..';
export interface FileUploadGeoResults {
    indexPatternId: string;
    geoFieldName: string;
    geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE;
    docCount: number;
}
export interface GeoUploadWizardProps {
    isIndexingTriggered: boolean;
    onFileSelect: (geojsonFile: FeatureCollection, name: string, previewCoverage: number) => void;
    onFileClear: () => void;
    enableImportBtn: () => void;
    disableImportBtn: () => void;
    onUploadComplete: (results: FileUploadGeoResults) => void;
    onUploadError: () => void;
    analytics: AnalyticsServiceStart;
    location: string;
}
export interface LazyLoadedFileUploadModules {
    GeoUploadWizard: React.ComponentType<GeoUploadWizardProps>;
    IndexNameForm: React.ComponentType<IndexNameFormProps>;
    importerFactory: (format: string, options: ImportFactoryOptions) => IImporter;
    getHttp: () => HttpStart;
}
export declare function lazyLoadModules(): Promise<LazyLoadedFileUploadModules>;
