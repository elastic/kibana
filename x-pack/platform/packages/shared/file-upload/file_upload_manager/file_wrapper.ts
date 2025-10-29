/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import type {
  FindFileStructureResponse,
  FormattedOverrides,
  ImportFailure,
  IngestPipeline,
  InputOverrides,
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

  private pipeline$ = new BehaviorSubject<IngestPipeline | undefined>(undefined);
  public readonly pipelineObvs$ = this.pipeline$.asObservable();
  private pipelineJsonValid$ = new BehaviorSubject<boolean>(true);

  public readonly fileStatus$ = this.analyzedFile$.asObservable();
  private fileSizeChecker: FileSizeChecker;

  constructor(
    private file: File,
    private fileUpload: FileUploadStartApi,
    private data: DataPublicPluginStart
  ) {
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

  public destroy() {
    this.analyzedFile$.complete();
    this.pipeline$.complete();
    this.pipelineJsonValid$.complete();
  }

  public async analyzeFile(overrides: InputOverrides = {}) {
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
    });
  }

  private async analyzeTika(data: ArrayBuffer, isRetry = false): Promise<AnalysisResults> {
    const { tikaResults, standardResults } = await analyzeTikaFile(data, this.fileUpload);
    const serverSettings = processResults(standardResults);

    return {
      fileContents: tikaResults.content,
      results: standardResults.results,
      sampleDocs: [],
      explanation: standardResults.results.explanation,
      serverSettings,
      overrides: {},
      analysisStatus: STATUS.COMPLETED,
    };
  }

  private async analyzeStandardFile(
    fileContents: string,
    overrides: InputOverrides,
    isRetry = false
  ): Promise<AnalysisResults> {
    try {
      const resp = await this.fileUpload.analyzeFile(
        fileContents,
        overrides as Record<string, string>,
        true
      );

      const serverSettings = processResults(resp);
      const sampleDocs = await getSampleDocs(this.data, resp, this.file.name);

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
      return {
        fileContents,
        results: null,
        sampleDocs: [],
        explanation: undefined,
        serverSettings: null,
        analysisError: e,
        overrides: {},
        analysisStatus: STATUS.FAILED,
      };
    }
  }

  private setStatus(status: Partial<FileAnalysis>) {
    this.analyzedFile$.next({
      ...this.getStatus(),
      ...status,
    });
  }

  public getStatus() {
    return this.analyzedFile$.getValue();
  }

  public getFileName() {
    return this.analyzedFile$.getValue().fileName;
  }
  public getMappings() {
    return this.analyzedFile$.getValue().results?.mappings;
  }
  public getPipeline(): IngestPipeline | undefined {
    return this.pipeline$.getValue();
  }
  public isPipelineValid() {
    return this.pipelineJsonValid$.getValue();
  }
  public setPipeline(pipeline: IngestPipeline | undefined) {
    this.pipeline$.next(pipeline);
  }
  public setPipelineValid(valid: boolean) {
    this.pipelineJsonValid$.next(valid);
  }
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
  public getFormat() {
    return this.analyzedFile$.getValue().results?.format;
  }
  public getData() {
    return this.analyzedFile$.getValue().data;
  }

  public getFileSizeInfo() {
    return {
      fileSizeFormatted: this.fileSizeChecker.fileSizeFormatted(),
      maxFileSizeFormatted: this.fileSizeChecker.maxFileSizeFormatted(),
      diffFormatted: this.fileSizeChecker.fileSizeDiffFormatted(),
    };
  }

  public async import(index: string, mappings: MappingTypeMapping, pipelineId: string | undefined) {
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
    try {
      const resp = await importer.import(index, pipelineId, (p) => {
        this.setStatus({ importProgress: p });
      });

      this.setStatus({
        docCount: resp.docCount,
        failures: resp.failures ?? [],
        importStatus: STATUS.COMPLETED,
      });
      return resp;
    } catch (error) {
      this.setStatus({ importStatus: STATUS.FAILED });
      return;
    }
  }
}
