import type { FileUploadPluginStartApi } from '@kbn/file-upload-plugin/public/api';
import type { Observable } from 'rxjs';
import type { AnalyticsServiceStart, ApplicationStart, HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { IndicesIndexSettings, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { FileUploadResults, IngestPipeline, InputOverrides } from '@kbn/file-upload-common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FileAnalysis } from './file_wrapper';
import { FileWrapper } from './file_wrapper';
import type { FileClash } from './merge_tools';
export declare enum STATUS {
    NA = 0,
    NOT_STARTED = 1,
    STARTED = 2,
    COMPLETED = 3,
    FAILED = 4,
    ABORTED = 5
}
export interface Dependencies {
    analytics: AnalyticsServiceStart;
    data: DataPublicPluginStart;
    fileUpload: FileUploadPluginStartApi;
    http: HttpSetup;
    notifications: NotificationsStart;
    capabilities: ApplicationStart['capabilities'];
}
export interface Config<T = IndicesIndexSettings | MappingTypeMapping> {
    json: T;
    valid: boolean;
}
export interface UploadStatus {
    analysisStatus: STATUS;
    overallImportStatus: STATUS;
    overallImportProgress: number;
    indexCreated: STATUS;
    pipelineCreated: STATUS;
    modelDeployed: STATUS;
    dataViewCreated: STATUS;
    pipelinesDeleted: STATUS;
    fileImport: STATUS;
    filesStatus: FileAnalysis[];
    fileClashes: FileClash[];
    formatMix: boolean;
    mappingsJsonValid: boolean;
    settingsJsonValid: boolean;
    pipelinesJsonValid: boolean;
    indexSearchable: boolean;
    allDocsSearchable: boolean;
    errors: Array<{
        title: string;
        error: any;
    }>;
    totalDocs: number;
    totalFailedDocs: number;
}
export declare class FileUploadManager {
    private autoAddInferenceEndpointName;
    private autoCreateDataView;
    private removePipelinesAfterImport;
    private uploadSessionId;
    private http;
    private data;
    private fileUpload;
    private notifications;
    private readonly files$;
    private readonly analysisValid$;
    readonly fileAnalysisStatus$: Observable<FileAnalysis[]>;
    readonly filePipelines$: Observable<Array<IngestPipeline | undefined>>;
    private readonly existingIndexMappings$;
    private mappingsCheckSubscription;
    private progressSubscription;
    private readonly _settings$;
    readonly settings$: Observable<Config<IndicesIndexSettings>>;
    private readonly _mappings$;
    readonly mappings$: Observable<Config<MappingTypeMapping>>;
    private readonly _existingIndexName$;
    readonly existingIndexName$: Observable<string | null>;
    private inferenceId;
    private importer;
    private timeFieldName;
    private commonFileFormat;
    private docCountService;
    private initializedWithExistingIndex;
    private fileUploadTelemetryService;
    private importAbortController;
    private canCreateDataView;
    private readonly _uploadStatus$;
    readonly uploadStatus$: Observable<UploadStatus>;
    private autoAddSemanticTextField;
    constructor(dependencies: Dependencies, autoAddInferenceEndpointName?: string | null, autoCreateDataView?: boolean, removePipelinesAfterImport?: boolean, existingIndexName?: string | null, indexSettingsOverride?: IndicesIndexSettings | undefined, location?: string | null, onIndexSearchable?: (indexName: string) => void, onAllDocsSearchable?: (indexName: string) => void);
    destroy(): void;
    private setStatus;
    addFiles(fileList: FileList | File[]): Promise<void>;
    addFile(file: File): Promise<void>;
    removeFile(index: number): Promise<void>;
    abortAnalysis(): Promise<void>;
    abortImport(): Promise<void>;
    /**
     * Removes files that have clashing mappings and cannot be imported together.
     * Files marked with ERROR clash type will be removed from the file list.
     */
    removeClashingFiles(): Promise<void>;
    /**
     * Creates a function to analyze a file at the specified index with custom overrides.
     * @param index - The index of the file to analyze
     * @returns A function that accepts overrides and performs the file analysis
     */
    analyzeFileWithOverrides(index: number): (overrides: InputOverrides) => Promise<void>;
    /**
     * Gets the current upload status including file clashes, analysis status, and import progress.
     * @returns The current upload status
     */
    getUploadStatus(): UploadStatus;
    /**
     * Checks if the file upload manager was initialized with an existing index.
     * @returns True if initialized with an existing index, false otherwise
     */
    getInitializedWithExistingIndex(): boolean;
    /**
     * Gets the name of the existing index being used for import.
     * @returns The existing index name or null if none is set
     */
    getExistingIndexName(): string | null;
    /**
     * Sets the existing index name and resets the analysis status.
     * @param name - The index name to set, or null to clear
     */
    setExistingIndexName(name: string | null): void;
    /**
     * Checks if this upload is targeting an existing index.
     * @returns True if uploading to an existing index, false otherwise
     */
    isExistingIndexUpload(): boolean;
    /**
     * Gets the current array of file wrappers being managed.
     * @returns Array of FileWrapper instances
     */
    getFiles(): FileWrapper[];
    private getFileClashes;
    private getFileClashTotals;
    private getFormatClashes;
    private getPipelines;
    private allPipelinesValid;
    updatePipeline(index: number): (pipeline: string) => void;
    /**
     * Updates the pipelines for all files with the provided array.
     * @param pipelines - Array of pipelines corresponding to each file
     */
    updatePipelines(pipelines: Array<IngestPipeline | undefined>): void;
    /**
     * Gets the current index mappings.
     * @returns The current mappings configuration
     */
    getMappings(): Config<MappingTypeMapping>;
    /**
     * Updates the index mappings configuration.
     * @param mappings - New mappings as object or JSON string
     */
    updateMappings(mappings: MappingTypeMapping | string): void;
    /**
     * Gets the current index settings.
     * @returns The current index settings configuration
     */
    getSettings(): Config<IndicesIndexSettings>;
    /**
     * Updates the index settings configuration.
     * @param settings - New settings as object or JSON string
     */
    updateSettings(settings: IndicesIndexSettings | string): void;
    private updateSettingsOrMappings;
    /**
     * Gets whether a data view should be automatically created after import.
     * @returns True if auto-creating data view, false otherwise
     */
    getAutoCreateDataView(): boolean;
    /**
     * Imports all files into the specified index with optional data view creation.
     * @param indexName - Name of the target index
     * @param dataViewName - Optional name for the data view to create
     * @returns Promise resolving to import results or null if cancelled
     */
    import(indexName: string, dataViewName?: string | null): Promise<FileUploadResults | null>;
    private autoDeploy;
    private isTikaFormat;
    private addSemanticTextField;
    private loadExistingIndexMappings;
    /**
     * Renames target fields in CSV processors across all file pipelines.
     * @param changes - Array of field name changes to apply
     */
    renamePipelineTargetFields(changes: {
        oldName: string;
        newName: string;
    }[]): void;
    /**
     * Removes all convert processors from all file pipelines.
     */
    removeConvertProcessors(): void;
    /**
     * Updates date field processors in all file pipelines based on current mappings.
     * @param mappings - Current index mappings to validate against
     */
    updateDateFields(mappings: MappingTypeMapping): void;
    private sendTelemetryProvider;
    private checkImportAbortedProvider;
}
export declare function createKibanaDataView(dataViewName: string, dataViewsContract: DataViewsServicePublic, timeFieldName?: string): Promise<{
    success: boolean;
    id: string | undefined;
    error?: undefined;
    title?: undefined;
} | {
    success: boolean;
    error: any;
    id: undefined;
    title: undefined;
}>;
export declare function getInferenceId(mappings: MappingTypeMapping): string | null;
export declare function semanticTextFieldExists(mappings: MappingTypeMapping): boolean;
