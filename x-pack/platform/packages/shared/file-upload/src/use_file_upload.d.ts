import type { Index } from '@kbn/index-management-shared-types/src/types';
import type { ApplicationStart, HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import { type FileUploadResults } from '@kbn/file-upload-common';
import { STATUS, type FileUploadManager } from '../file_upload_manager';
export declare enum UPLOAD_TYPE {
    NEW = "new",
    EXISTING = "existing"
}
export declare function useFileUpload(fileUploadManager: FileUploadManager, data: DataPublicPluginStart, application: ApplicationStart, http: HttpSetup, notifications: NotificationsStart, getFieldsStatsGrid?: () => React.FC<{
    results: FindFileStructureResponse | null;
}>, onUploadComplete?: (results: FileUploadResults | null) => void, reset?: (existingIndex?: string) => void): {
    fileUploadManager: FileUploadManager;
    indexName: string;
    setIndexName: import("react").Dispatch<import("react").SetStateAction<string>>;
    indexValidationStatus: STATUS;
    setIndexValidationStatus: import("react").Dispatch<import("react").SetStateAction<STATUS>>;
    deleteFile: (i: number) => Promise<void>;
    filesStatus: import("../file_upload_manager").FileAnalysis[];
    uploadStatus: import("../file_upload_manager").UploadStatus;
    fileClashes: boolean;
    fullFileUpload: () => Promise<void>;
    uploadStarted: boolean;
    onImportClick: () => Promise<void>;
    canImport: boolean;
    mappings: import("../file_upload_manager").Config<import("@elastic/elasticsearch/lib/api/types").MappingTypeMapping>;
    settings: import("../file_upload_manager").Config<import("@elastic/elasticsearch/lib/api/types").IndicesIndexSettings>;
    pipelines: (import("@kbn/file-upload-common").IngestPipeline | undefined)[];
    importResults: FileUploadResults | null;
    dataViewName: string | null;
    setDataViewName: import("react").Dispatch<import("react").SetStateAction<string | null>>;
    dataViewNameError: string;
    indexCreateMode: UPLOAD_TYPE;
    setIndexCreateMode: import("react").Dispatch<import("react").SetStateAction<UPLOAD_TYPE>>;
    indices: Index[];
    existingIndexName: string | null;
    setExistingIndexName: (idxName: string | null) => void;
    abortAllAnalysis: () => void;
    abortImport: () => void;
    getFieldsStatsGrid: (() => React.FC<{
        results: FindFileStructureResponse | null;
    }>) | undefined;
    reset: ((existingIndex?: string) => void) | undefined;
    canCreateDataView: boolean;
};
type FileUploadContextValue = ReturnType<typeof useFileUpload>;
export declare const FileUploadContext: import("react").Context<{
    fileUploadManager: FileUploadManager;
    indexName: string;
    setIndexName: import("react").Dispatch<import("react").SetStateAction<string>>;
    indexValidationStatus: STATUS;
    setIndexValidationStatus: import("react").Dispatch<import("react").SetStateAction<STATUS>>;
    deleteFile: (i: number) => Promise<void>;
    filesStatus: import("../file_upload_manager").FileAnalysis[];
    uploadStatus: import("../file_upload_manager").UploadStatus;
    fileClashes: boolean;
    fullFileUpload: () => Promise<void>;
    uploadStarted: boolean;
    onImportClick: () => Promise<void>;
    canImport: boolean;
    mappings: import("../file_upload_manager").Config<import("@elastic/elasticsearch/lib/api/types").MappingTypeMapping>;
    settings: import("../file_upload_manager").Config<import("@elastic/elasticsearch/lib/api/types").IndicesIndexSettings>;
    pipelines: (import("@kbn/file-upload-common").IngestPipeline | undefined)[];
    importResults: FileUploadResults | null;
    dataViewName: string | null;
    setDataViewName: import("react").Dispatch<import("react").SetStateAction<string | null>>;
    dataViewNameError: string;
    indexCreateMode: UPLOAD_TYPE;
    setIndexCreateMode: import("react").Dispatch<import("react").SetStateAction<UPLOAD_TYPE>>;
    indices: Index[];
    existingIndexName: string | null;
    setExistingIndexName: (idxName: string | null) => void;
    abortAllAnalysis: () => void;
    abortImport: () => void;
    getFieldsStatsGrid: (() => React.FC<{
        results: FindFileStructureResponse | null;
    }>) | undefined;
    reset: ((existingIndex?: string) => void) | undefined;
    canCreateDataView: boolean;
} | undefined>;
export declare const useFileUploadContext: () => FileUploadContextValue;
export {};
