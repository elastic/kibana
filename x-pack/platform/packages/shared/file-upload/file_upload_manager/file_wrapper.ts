/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FileUploadPluginStartApi } from '@kbn/file-upload-plugin/public/api';
import {
  FileUploadTelemetryService,
  isAbortError,
  type FindFileStructureResponse,
  type FormattedOverrides,
  type ImportFailure,
  type ImportResults,
  type IngestPipeline,
  type InputOverrides,
} from '@kbn/file-upload-common';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { type DataTableRecord } from '@kbn/discover-utils';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { isTikaType } from './tika_utils';

import { STATUS } from './file_manager';
import { analyzeTikaFile } from './tika_analyzer';
import { FileSizeChecker } from './file_size_check';
import { processResults, readFile, isSupportedFormat } from '../src/utils';
import { getSampleDocs } from './doc_count_service';
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

export class FileWrapper {
  private analyzedFile$ = new BehaviorSubject<FileAnalysis>({
    analysisStatus: STATUS.NOT_STARTED,
    fileContents: '',
    results: null,
    sampleDocs: [],
    explanation: undefined,
    serverSettings: null,
    overrides: {},
    loaded: false,
    importStatus: STATUS.NOT_STARTED,
    fileName: '',
    data: null,
    fileTooLarge: false,
    fileCouldNotBeRead: false,
    fileCouldNotBeReadPermissionError: false,
    serverError: false,
    importProgress: 0,
    docCount: 0,
    supportedFormat: true,
    failures: [],
    fileSizeInfo: {
      fileSize: 0,
      fileSizeFormatted: '',
      maxFileSizeFormatted: '',
      diffFormatted: '',
    },
  });

  private fileId: string;

  private pipeline$ = new BehaviorSubject<IngestPipeline | undefined>(undefined);
  public readonly pipelineObvs$ = this.pipeline$.asObservable();
  private pipelineJsonValid$ = new BehaviorSubject<boolean>(true);

  public readonly fileStatus$ = this.analyzedFile$.asObservable();
  private fileSizeChecker: FileSizeChecker;
  private analysisAbortController: AbortController | null = null;

  constructor(
    private file: File,
    private fileUpload: FileUploadPluginStartApi,
    private data: DataPublicPluginStart,
    private fileUploadTelemetryService: FileUploadTelemetryService,
    private uploadSessionId: string
  ) {
    this.fileId = FileUploadTelemetryService.generateId();
    this.fileSizeChecker = new FileSizeChecker(fileUpload, file);
    this.analyzedFile$.next({
      ...this.analyzedFile$.getValue(),
      fileName: this.file.name,
      loaded: false,
      fileTooLarge: !this.fileSizeChecker.isValid(),
      fileSizeInfo: {
        fileSize: this.file.size,
        fileSizeFormatted: this.fileSizeChecker.fileSizeFormatted(),
        maxFileSizeFormatted: this.fileSizeChecker.maxFileSizeFormatted(),
        diffFormatted: this.fileSizeChecker.fileSizeDiffFormatted(),
      },
    });
  }

  /**
   * Cleans up resources and aborts any ongoing analysis.
   * Should be called when the file wrapper is no longer needed.
   */
  public destroy() {
    this.analysisAbortController?.abort();

    this.analyzedFile$.complete();
    this.pipeline$.complete();
    this.pipelineJsonValid$.complete();
  }

  /**
   * Analyzes the file to determine its structure and create mappings/pipelines.
   * @param overrides - Optional analysis overrides to customize the analysis
   */
  public async analyzeFile(overrides: InputOverrides = {}) {
    const startTime = new Date().getTime();
    this.setStatus({ analysisStatus: STATUS.STARTED });
    readFile(this.file).then(async ({ data, fileContents }) => {
      // return after file has been read
      // analysis will be done in the background

      let analysisResults: AnalysisResults;
      let parsedFileContents = fileContents;

      if (isTikaType(this.file.type)) {
        analysisResults = await this.analyzeTika(data);
        parsedFileContents = analysisResults.fileContents;
      } else {
        analysisResults = await this.analyzeStandardFile(fileContents, overrides);
      }
      const supportedFormat = isSupportedFormat(analysisResults.results?.format ?? '');

      this.setStatus({
        ...analysisResults,
        loaded: true,
        fileName: this.file.name,
        fileContents: parsedFileContents,
        data,
        supportedFormat,
      });

      this.setPipeline(analysisResults.results?.ingest_pipeline);

      this.analyzeFileTelemetry(analysisResults, overrides, new Date().getTime() - startTime);
    });
  }

  private async analyzeTika(data: ArrayBuffer, isRetry = false): Promise<AnalysisResults> {
    try {
      this.analysisAbortController = new AbortController();
      const { tikaResults, standardResults } = await analyzeTikaFile(
        data,
        this.fileUpload,
        this.analysisAbortController.signal
      );
      const serverSettings = processResults(standardResults);
      this.analysisAbortController = null;

      return {
        fileContents: tikaResults.content,
        results: standardResults.results,
        sampleDocs: [],
        explanation: standardResults.results.explanation,
        serverSettings,
        overrides: {},
        analysisStatus: STATUS.COMPLETED,
      };
    } catch (e) {
      const analysisStatus = this.analysisAbortController?.signal.aborted
        ? STATUS.ABORTED
        : STATUS.FAILED;
      this.analysisAbortController = null;
      return {
        fileContents: '',
        results: null,
        sampleDocs: [],
        explanation: undefined,
        serverSettings: null,
        analysisError: e,
        overrides: {},
        analysisStatus,
      };
    }
  }

  private async analyzeStandardFile(
    fileContents: string,
    overrides: InputOverrides,
    isRetry = false
  ): Promise<AnalysisResults> {
    try {
      this.analysisAbortController = new AbortController();
      const resp = await this.fileUpload.analyzeFile(
        fileContents,
        overrides as Record<string, string>,
        true,
        this.analysisAbortController.signal
      );

      const serverSettings = processResults(resp);
      const sampleDocs = await getSampleDocs(this.data, resp, this.file.name);
      this.analysisAbortController = null;

      return {
        fileContents,
        results: resp.results,
        explanation: resp.results.explanation,
        serverSettings,
        overrides: resp.overrides ?? {},
        analysisStatus: STATUS.COMPLETED,
        sampleDocs,
      };
    } catch (e) {
      const analysisStatus = this.analysisAbortController?.signal.aborted
        ? STATUS.ABORTED
        : STATUS.FAILED;
      this.analysisAbortController = null;

      return {
        fileContents,
        results: null,
        sampleDocs: [],
        explanation: undefined,
        serverSettings: null,
        analysisError: e,
        overrides: {},
        analysisStatus,
      };
    }
  }

  /**
   * Aborts the current file analysis operation.
   */
  public abortAnalysis() {
    this.analysisAbortController?.abort();
    this.setStatus({
      analysisStatus: STATUS.ABORTED,
    });
  }

  private setStatus(status: Partial<FileAnalysis>) {
    this.analyzedFile$.next({
      ...this.getStatus(),
      ...status,
    });
  }

  /**
   * Gets the current analysis status and file information.
   * @returns Current file analysis status
   */
  public getStatus() {
    return this.analyzedFile$.getValue();
  }

  /**
   * Gets the name of the file being processed.
   * @returns The file name
   */
  public getFileName() {
    return this.analyzedFile$.getValue().fileName;
  }

  /**
   * Gets the Elasticsearch mappings generated from file analysis.
   * @returns The mappings or undefined if analysis hasn't completed
   */
  public getMappings() {
    return this.analyzedFile$.getValue().results?.mappings;
  }

  /**
   * Gets the current ingest pipeline for processing the file.
   * @returns The ingest pipeline or undefined if none is set
   */
  public getPipeline(): IngestPipeline | undefined {
    return this.pipeline$.getValue();
  }

  /**
   * Checks if the current pipeline JSON is valid.
   * @returns True if the pipeline is valid, false otherwise
   */
  public isPipelineValid() {
    return this.pipelineJsonValid$.getValue();
  }

  /**
   * Sets the ingest pipeline for processing the file.
   * @param pipeline - The ingest pipeline to set
   */
  public setPipeline(pipeline: IngestPipeline | undefined) {
    this.pipeline$.next(pipeline);
  }

  /**
   * Sets whether the pipeline JSON is valid.
   * @param valid - True if the pipeline is valid, false otherwise
   */
  public setPipelineValid(valid: boolean) {
    this.pipelineJsonValid$.next(valid);
  }

  /**
   * Updates the pipeline with a new pipeline object or JSON string.
   * Validates JSON and sets pipeline validity accordingly.
   * @param pipeline - New pipeline as object or JSON string
   */
  public updatePipeline(pipeline: IngestPipeline | string) {
    if (typeof pipeline === 'string') {
      try {
        const json = JSON.parse(pipeline);
        const currentPipeline = this.getPipeline();
        const currentPipelineString = JSON.stringify(currentPipeline);
        const incomingPipelineString = JSON.stringify(json);

        this.setPipelineValid(true);

        if (currentPipelineString === incomingPipelineString) {
          return;
        }

        this.setPipeline(json);
      } catch (e) {
        this.setPipelineValid(false);
        return;
      }
    } else {
      this.setPipeline(pipeline);
    }
  }

  /**
   * Gets the detected file format from analysis.
   * @returns The file format or undefined if analysis hasn't completed
   */
  public getFormat() {
    return this.analyzedFile$.getValue().results?.format;
  }

  /**
   * Gets the raw file data as ArrayBuffer.
   * @returns The file data or null if not loaded
   */
  public getData() {
    return this.analyzedFile$.getValue().data;
  }

  /**
   * Gets the file size in bytes.
   * @returns The file size in bytes
   */
  public getSizeInBytes() {
    return this.file.size;
  }

  /**
   * Gets formatted file size information including max allowed size.
   * @returns Object containing formatted size strings
   */
  public getFileSizeInfo() {
    return {
      fileSizeFormatted: this.fileSizeChecker.fileSizeFormatted(),
      maxFileSizeFormatted: this.fileSizeChecker.maxFileSizeFormatted(),
      diffFormatted: this.fileSizeChecker.fileSizeDiffFormatted(),
    };
  }

  /**
   * Imports the file data into the specified Elasticsearch index.
   * @param index - Target index name
   * @param mappings - Index mappings configuration
   * @param pipelineId - Optional ingest pipeline ID
   * @param getFileClashes - Function to get file clash information
   * @param signal - Optional abort signal to cancel import
   * @returns Promise resolving to import results
   */
  public async import(
    index: string,
    mappings: MappingTypeMapping,
    pipelineId: string | undefined,
    getFileClashes: () => FileClash | null,
    signal?: AbortSignal
  ) {
    this.setStatus({ importStatus: STATUS.STARTED });
    const format = this.analyzedFile$.getValue().results!.format;
    const importer = await this.fileUpload.importerFactory(format, {
      excludeLinesPattern: this.analyzedFile$.getValue().results!.exclude_lines_pattern,
      multilineStartPattern: this.analyzedFile$.getValue().results!.multiline_start_pattern,
    });

    const ingestPipeline = this.getPipeline();
    importer.initializeWithoutCreate(index, mappings, ingestPipeline ? [ingestPipeline] : []);
    const data = this.getData();
    if (data === null) {
      this.setStatus({ importStatus: STATUS.FAILED });
      return;
    }
    importer.read(data);
    const startTime = new Date().getTime();
    try {
      const resp = await importer.import(
        index,
        pipelineId,
        (p) => {
          this.setStatus({ importProgress: p });
        },
        signal
      );

      this.setStatus({
        docCount: resp.docCount,
        failures: resp.failures ?? [],
        importStatus: STATUS.COMPLETED,
      });
      this.uploadFileTelemetry(resp, getFileClashes, new Date().getTime() - startTime);

      return resp;
    } catch (error) {
      this.setStatus({ importStatus: isAbortError(error) ? STATUS.ABORTED : STATUS.FAILED });
      this.uploadFileTelemetry(undefined, getFileClashes, new Date().getTime() - startTime);
      return;
    }
  }

  /**
   * Removes all convert processors from the current pipeline.
   * Convert processors are typically used for type conversion during ingestion.
   */
  public removeConvertProcessors() {
    const pipeline = this.getPipeline();
    if (pipeline?.processors === undefined) {
      return;
    }
    const tempPipeline = {
      ...pipeline,
      processors: pipeline.processors.filter((processor) => processor.convert === undefined),
    };
    this.setPipeline(tempPipeline);
  }

  /**
   * Renames target fields in CSV processors within the pipeline.
   * @param changes - Array of field name changes to apply
   */
  public renameTargetFields(
    changes: {
      oldName: string;
      newName: string;
    }[]
  ) {
    const pipeline = this.getPipeline();
    if (pipeline?.processors === undefined) {
      return;
    }

    const renameMap = new Map<string, string>();
    changes.forEach((change) => {
      if (change.oldName !== change.newName) {
        renameMap.set(change.oldName, change.newName);
      }
    });

    pipeline.processors.forEach((processor) => {
      if (Array.isArray(processor?.csv?.target_fields)) {
        processor.csv.target_fields = (processor.csv.target_fields as string[]).map((fieldName) => {
          const newName = renameMap.get(fieldName);
          return newName !== undefined ? newName : fieldName;
        });
      }
    });

    this.setPipeline(pipeline);
  }

  /**
   * Updates date processors in the pipeline based on current field mappings.
   * Removes invalid date processors and adds new ones for date fields with formats.
   * @param mappings - Current index mappings to validate against
   */
  public updateDateField(mappings: MappingTypeMapping) {
    const pipeline = this.getPipeline();
    if (pipeline?.processors === undefined || !mappings.properties) {
      return;
    }

    pipeline.processors = pipeline.processors.filter((processor) => {
      if (processor.date) {
        const fieldName = processor.date.field;
        const fieldMapping = mappings.properties![fieldName];

        if (!fieldMapping || fieldMapping.type !== 'date') {
          return false;
        }

        const processorFormats: string[] = processor.date.formats;
        const mappingFormat = fieldMapping.format;

        if (processorFormats && mappingFormat) {
          const hasMatchingFormat = processorFormats.some(
            (format) => mappingFormat === format || mappingFormat.includes(format)
          );
          if (!hasMatchingFormat) {
            return false;
          }
        }
      }

      return true;
    });

    const existingDateFields = new Set(
      pipeline.processors.filter((p) => p.date).map((p) => p.date!.field)
    );

    const newDateProcessors = [];
    for (const [fieldName, fieldMapping] of Object.entries(mappings.properties)) {
      if (
        fieldMapping.type === 'date' &&
        fieldMapping.format &&
        !existingDateFields.has(fieldName)
      ) {
        newDateProcessors.push({
          date: {
            field: fieldName,
            formats: [fieldMapping.format],
          },
        });
      }
    }

    if (newDateProcessors.length > 0 && pipeline.processors.length > 0) {
      const lastProcessor = pipeline.processors.pop();
      pipeline.processors.push(...newDateProcessors);
      if (lastProcessor) {
        pipeline.processors.push(lastProcessor);
      }
    } else if (newDateProcessors.length > 0) {
      pipeline.processors.push(...newDateProcessors);
    }

    this.setPipeline(pipeline);
  }

  private analyzeFileTelemetry(
    analysisResults: AnalysisResults | undefined,
    overrides: InputOverrides,
    analysisTimeMs: number
  ) {
    if (analysisResults?.results) {
      this.fileUploadTelemetryService.trackAnalyzeFile({
        analysis_success: true,
        analysis_cancelled: false,
        upload_session_id: this.uploadSessionId,
        file_id: this.fileId,
        file_type: analysisResults.results.format,
        file_extension: FileUploadTelemetryService.getFileExtension(this.file.name),
        file_size_bytes: this.file.size ?? 0,
        num_lines_analyzed: analysisResults.results.num_lines_analyzed,
        num_messages_analyzed: analysisResults.results.num_messages_analyzed,
        java_timestamp_formats: analysisResults.results.java_timestamp_formats?.join(',') ?? '',
        num_fields_found: Object.keys(analysisResults.results.field_stats).length,
        delimiter: analysisResults.results.delimiter ?? '',
        preview_success: analysisResults.sampleDocs.length > 0,
        overrides_used: Object.keys(overrides).length > 0,
        analysis_time_ms: analysisTimeMs,
      });
    } else {
      this.fileUploadTelemetryService.trackAnalyzeFile({
        analysis_success: false,
        analysis_cancelled: analysisResults?.analysisStatus === STATUS.ABORTED,
        upload_session_id: this.uploadSessionId,
        file_id: this.fileId,
        file_type: 'unknown',
        file_extension: FileUploadTelemetryService.getFileExtension(this.file.name),
        file_size_bytes: this.file.size ?? 0,
        num_lines_analyzed: 0,
        num_messages_analyzed: 0,
        java_timestamp_formats: '',
        num_fields_found: 0,
        delimiter: '',
        preview_success: false,
        overrides_used: Object.keys(overrides).length > 0,
        analysis_time_ms: analysisTimeMs,
      });
    }
  }

  private uploadFileTelemetry(
    resp: ImportResults | undefined,
    getFileClashes: () => FileClash | null,
    uploadTimeMs: number
  ) {
    const importStatus = this.getStatus().importStatus;
    const failureCount = resp?.failures ? resp.failures.length : 0;
    const fileClash = getFileClashes();
    this.fileUploadTelemetryService.trackUploadFile({
      upload_session_id: this.uploadSessionId,
      file_id: this.fileId,
      file_size_bytes: this.file.size ?? 0,
      mapping_clash_new_fields: fileClash?.newFields?.length ?? 0,
      mapping_clash_missing_fields: fileClash?.missingFields?.length ?? 0,
      documents_success: resp?.docCount !== undefined ? resp.docCount - failureCount : 0,
      documents_failed: failureCount,
      upload_success: resp?.success === true,
      upload_cancelled: importStatus === STATUS.ABORTED,
      upload_time_ms: uploadTimeMs,
      file_extension: FileUploadTelemetryService.getFileExtension(this.file.name),
    });
  }
}
