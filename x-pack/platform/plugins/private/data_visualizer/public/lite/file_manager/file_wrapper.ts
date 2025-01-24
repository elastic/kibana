/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common/types';
import { isTikaType } from '../../../common/utils/tika_utils';
import { processResults, readFile } from '../../application/common/components/utils';
import { analyzeTikaFile } from '../../application/file_data_visualizer/components/file_data_visualizer_view/tika_analyzer';
import { STATUS } from './file_manager';
import { FileSizeChecker } from '../../application/file_data_visualizer/components/file_data_visualizer_view/file_size_check';

interface AnalysisResults {
  analysisStatus: STATUS;
  fileContents: string;
  results: FindFileStructureResponse | null;
  explanation: string[] | undefined;
  serverSettings: ReturnType<typeof processResults> | null;
  analysisError?: any;
}

export type AnalyzedFile = AnalysisResults & {
  loaded: boolean;
  importStatus: STATUS;
  fileName: string;
  fileContents: string;
  fileSize: string;
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
};

export class FileWrapper {
  private analyzedFile$ = new BehaviorSubject<AnalyzedFile>({
    analysisStatus: STATUS.NOT_STARTED,
    fileContents: '',
    fileSize: '',
    results: null,
    explanation: undefined,
    serverSettings: null,
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
  });

  public readonly fileStatus$ = this.analyzedFile$.asObservable();
  private fileSizeChecker: FileSizeChecker;

  constructor(private file: File, private fileUpload: FileUploadStartApi) {
    this.fileSizeChecker = new FileSizeChecker(fileUpload, file);
    this.analyzedFile$.next({
      ...this.analyzedFile$.getValue(),
      fileName: this.file.name,
      loaded: false,
      fileTooLarge: !this.fileSizeChecker.check(),
      fileSize: this.fileSizeChecker.fileSizeFormatted(),
    });
  }

  public destroy() {
    this.analyzedFile$.complete();
  }

  public async analyzeFile() {
    this.setStatus({ analysisStatus: STATUS.STARTED });
    readFile(this.file).then(async ({ data, fileContents }) => {
      // return after file has been read
      // analysis will be done in the background

      let analysisResults: AnalysisResults;

      if (isTikaType(this.file.type)) {
        analysisResults = await this.analyzeTika(data);
      } else {
        analysisResults = await this.analyzeStandardFile(fileContents, {});
      }
      const supportedFormat = isSupportedFormat(analysisResults);

      this.setStatus({
        ...analysisResults,
        loaded: true,
        fileName: this.file.name,
        fileContents,
        data,
        supportedFormat,
      });
    });
  }

  private async analyzeTika(data: ArrayBuffer, isRetry = false): Promise<AnalysisResults> {
    const { tikaResults, standardResults } = await analyzeTikaFile(data, this.fileUpload);
    const serverSettings = processResults(standardResults);

    return {
      fileContents: tikaResults.content,
      results: standardResults.results,
      explanation: standardResults.results.explanation,
      serverSettings,
      analysisStatus: STATUS.COMPLETED,
    };
  }

  private async analyzeStandardFile(
    fileContents: string,
    overrides: any,
    isRetry = false
  ): Promise<AnalysisResults> {
    try {
      const resp = await this.fileUpload.analyzeFile(fileContents, overrides);
      const serverSettings = processResults(resp);

      return {
        fileContents,
        results: resp.results,
        explanation: resp.results.explanation,
        serverSettings,
        analysisStatus: STATUS.COMPLETED,
      };
    } catch (e) {
      return {
        fileContents,
        results: null,
        explanation: undefined,
        serverSettings: null,
        analysisError: e,
        analysisStatus: STATUS.FAILED,
      };
    }
  }

  private setStatus(status: Partial<AnalyzedFile>) {
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
  public getPipeline() {
    return this.analyzedFile$.getValue().results?.ingest_pipeline;
  }
  public getFormat() {
    return this.analyzedFile$.getValue().results?.format;
  }
  public getData() {
    return this.analyzedFile$.getValue().data;
  }

  public async import(id: string, index: string, pipelineId: string, mappings: any, pipeline: any) {
    this.setStatus({ importStatus: STATUS.STARTED });
    const format = this.analyzedFile$.getValue().results!.format;
    const importer = await this.fileUpload.importerFactory(format, {
      excludeLinesPattern: this.analyzedFile$.getValue().results!.exclude_lines_pattern,
      multilineStartPattern: this.analyzedFile$.getValue().results!.multiline_start_pattern,
    });
    importer.initializeWithoutCreate(index, mappings, pipeline);
    const data = this.getData();
    if (data === null) {
      this.setStatus({ importStatus: STATUS.FAILED });
      return;
    }
    importer.read(data);
    try {
      const resp = await importer.import(id, index, pipelineId, (p) => {
        this.setStatus({ importProgress: p });
      });
      this.setStatus({ docCount: resp.docCount, importStatus: STATUS.COMPLETED });
      return resp;
    } catch (error) {
      this.setStatus({ importStatus: STATUS.FAILED });
      return;
    }
  }
}

function isSupportedFormat(analysisResults: AnalysisResults) {
  const format = analysisResults.results?.format;
  return (
    format === 'ndjson' ||
    format === 'delimited' ||
    format === 'tika' ||
    format === 'semi_structured_text'
  );
}
