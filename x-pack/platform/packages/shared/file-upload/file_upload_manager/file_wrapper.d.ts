import type { FileUploadPluginStartApi } from '@kbn/file-upload-plugin/public/api';
import { FileUploadTelemetryService, type FindFileStructureResponse, type FormattedOverrides, type ImportFailure, type ImportResults, type IngestPipeline, type InputOverrides } from '@kbn/file-upload-common';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { type DataTableRecord } from '@kbn/discover-utils';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { STATUS } from './file_manager';
import { processResults } from '../src/utils';
import type { FileClash } from './merge_tools';
interface FileSizeInfo {
    fileSize: number;
    fileSizeFormatted: string;
    maxFileSizeFormatted: string;
    diffFormatted: string;
}
interface AnalysisResults {
    analysisStatus: STATUS;
    fileContents: string;
    results: FindFileStructureResponse | null;
    explanation: string[] | undefined;
    serverSettings: ReturnType<typeof processResults> | null;
    overrides: FormattedOverrides;
    analysisError?: any;
    sampleDocs: DataTableRecord[];
}
export type FileAnalysis = AnalysisResults & {
    loaded: boolean;
    importStatus: STATUS;
    fileName: string;
    fileContents: string;
    data: ArrayBuffer | null;
    fileTooLarge: boolean;
    fileCouldNotBeRead: boolean;
    fileCouldNotBeReadPermissionError: any;
    serverError: any;
    results: FindFileStructureResponse | null;
    explanation: string[] | undefined;
    importProgress: number;
    docCount: number;
    supportedFormat: boolean;
    failures: ImportFailure[];
    fileSizeInfo: FileSizeInfo;
};
export declare class FileWrapper {
    private file;
    private fileUpload;
    private data;
    private fileUploadTelemetryService;
    private uploadSessionId;
    private analyzedFile$;
    private fileId;
    private pipeline$;
    readonly pipelineObvs$: import("rxjs").Observable<IngestPipeline | undefined>;
    private pipelineJsonValid$;
    readonly fileStatus$: import("rxjs").Observable<FileAnalysis>;
    private fileSizeChecker;
    private analysisAbortController;
    constructor(file: File, fileUpload: FileUploadPluginStartApi, data: DataPublicPluginStart, fileUploadTelemetryService: FileUploadTelemetryService, uploadSessionId: string);
    /**
     * Cleans up resources and aborts any ongoing analysis.
     * Should be called when the file wrapper is no longer needed.
     */
    destroy(): void;
    /**
     * Analyzes the file to determine its structure and create mappings/pipelines.
     * @param overrides - Optional analysis overrides to customize the analysis
     */
    analyzeFile(overrides?: InputOverrides): Promise<void>;
    private analyzeTika;
    private analyzeStandardFile;
    /**
     * Aborts the current file analysis operation.
     */
    abortAnalysis(): void;
    private setStatus;
    /**
     * Gets the current analysis status and file information.
     * @returns Current file analysis status
     */
    getStatus(): FileAnalysis;
    /**
     * Gets the name of the file being processed.
     * @returns The file name
     */
    getFileName(): string;
    /**
     * Gets the Elasticsearch mappings generated from file analysis.
     * @returns The mappings or undefined if analysis hasn't completed
     */
    getMappings(): {
        properties: {
            [fieldName: string]: {
                type: Exclude<import("@kbn/data-plugin/public").ES_FIELD_TYPES, import("@kbn/data-plugin/public").ES_FIELD_TYPES._ID | import("@kbn/data-plugin/public").ES_FIELD_TYPES._INDEX | import("@kbn/data-plugin/public").ES_FIELD_TYPES._SOURCE | import("@kbn/data-plugin/public").ES_FIELD_TYPES._TYPE>;
                format?: string;
            };
        };
    } | undefined;
    /**
     * Gets the current ingest pipeline for processing the file.
     * @returns The ingest pipeline or undefined if none is set
     */
    getPipeline(): IngestPipeline | undefined;
    /**
     * Checks if the current pipeline JSON is valid.
     * @returns True if the pipeline is valid, false otherwise
     */
    isPipelineValid(): boolean;
    /**
     * Sets the ingest pipeline for processing the file.
     * @param pipeline - The ingest pipeline to set
     */
    setPipeline(pipeline: IngestPipeline | undefined): void;
    /**
     * Sets whether the pipeline JSON is valid.
     * @param valid - True if the pipeline is valid, false otherwise
     */
    setPipelineValid(valid: boolean): void;
    /**
     * Updates the pipeline with a new pipeline object or JSON string.
     * Validates JSON and sets pipeline validity accordingly.
     * @param pipeline - New pipeline as object or JSON string
     */
    updatePipeline(pipeline: IngestPipeline | string): void;
    /**
     * Gets the detected file format from analysis.
     * @returns The file format or undefined if analysis hasn't completed
     */
    getFormat(): string | undefined;
    /**
     * Gets the raw file data as ArrayBuffer.
     * @returns The file data or null if not loaded
     */
    getData(): ArrayBuffer | null;
    /**
     * Gets the file size in bytes.
     * @returns The file size in bytes
     */
    getSizeInBytes(): number;
    /**
     * Gets formatted file size information including max allowed size.
     * @returns Object containing formatted size strings
     */
    getFileSizeInfo(): {
        fileSizeFormatted: string;
        maxFileSizeFormatted: string;
        diffFormatted: string;
    };
    /**
     * Imports the file data into the specified Elasticsearch index.
     * @param index - Target index name
     * @param mappings - Index mappings configuration
     * @param pipelineId - Optional ingest pipeline ID
     * @param getFileClashes - Function to get file clash information
     * @param signal - Optional abort signal to cancel import
     * @returns Promise resolving to import results
     */
    import(index: string, mappings: MappingTypeMapping, pipelineId: string | undefined, getFileClashes: () => FileClash | null, signal?: AbortSignal): Promise<ImportResults | undefined>;
    /**
     * Removes all convert processors from the current pipeline.
     * Convert processors are typically used for type conversion during ingestion.
     */
    removeConvertProcessors(): void;
    /**
     * Renames target fields in CSV processors within the pipeline.
     * @param changes - Array of field name changes to apply
     */
    renameTargetFields(changes: {
        oldName: string;
        newName: string;
    }[]): void;
    /**
     * Updates date processors in the pipeline based on current field mappings.
     * Removes invalid date processors and adds new ones for date fields with formats.
     * @param mappings - Current index mappings to validate against
     */
    updateDateField(mappings: MappingTypeMapping): void;
    private analyzeFileTelemetry;
    private uploadFileTelemetry;
}
export {};
