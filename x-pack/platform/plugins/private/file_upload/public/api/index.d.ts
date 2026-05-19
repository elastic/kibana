import type { PreviewTikaResponse, AnalysisResult, ImportFactoryOptions } from '@kbn/file-upload-common';
import type { IImporter } from '../importer';
import type { getMaxBytes, getMaxBytesFormatted, getMaxTikaBytes, getMaxTikaBytesFormatted } from '../importer/get_max_bytes';
import { GeoUploadWizardAsyncWrapper } from './geo_upload_wizard_async_wrapper';
import { IndexNameFormAsyncWrapper } from './index_name_form_async_wrapper';
export interface FileUploadPluginStartApi {
    FileUploadComponent: typeof GeoUploadWizardAsyncWrapper;
    IndexNameFormComponent: typeof IndexNameFormAsyncWrapper;
    importerFactory: typeof importerFactory;
    getMaxBytes: typeof getMaxBytes;
    getMaxBytesFormatted: typeof getMaxBytesFormatted;
    getMaxTikaBytes: typeof getMaxTikaBytes;
    getMaxTikaBytesFormatted: typeof getMaxTikaBytesFormatted;
    hasImportPermission: typeof hasImportPermission;
    checkIndexExists: typeof checkIndexExists;
    getTimeFieldRange: typeof getTimeFieldRange;
    analyzeFile: typeof analyzeFile;
    previewTikaFile: typeof previewTikaFile;
    isIndexSearchable: typeof isIndexSearchable;
}
export interface GetTimeFieldRangeResponse {
    success: boolean;
    start: {
        epoch: number;
        string: string;
    };
    end: {
        epoch: number;
        string: string;
    };
}
export interface IsIndexSearchableResponse {
    isSearchable: boolean;
    count: number;
}
export declare const FileUploadComponent: typeof GeoUploadWizardAsyncWrapper;
export declare const IndexNameFormComponent: typeof IndexNameFormAsyncWrapper;
export declare function importerFactory(format: string, options: ImportFactoryOptions): Promise<IImporter>;
interface HasImportPermissionParams {
    checkCreateDataView: boolean;
    checkHasManagePipeline: boolean;
    indexName?: string;
}
export declare function analyzeFile(file: string, params: Record<string, string> | undefined, includePreview: boolean, signal?: AbortSignal): Promise<AnalysisResult>;
export declare function previewTikaFile(data: ArrayBuffer, signal?: AbortSignal): Promise<PreviewTikaResponse>;
export declare function hasImportPermission(params: HasImportPermissionParams): Promise<boolean>;
export declare function checkIndexExists(index: string, params?: Record<string, string>): Promise<boolean>;
export declare function getTimeFieldRange(index: string, query: unknown, timeFieldName?: string): Promise<GetTimeFieldRangeResponse>;
export declare function isIndexSearchable(index: string, expectedCount: number): Promise<IsIndexSearchableResponse>;
export {};
