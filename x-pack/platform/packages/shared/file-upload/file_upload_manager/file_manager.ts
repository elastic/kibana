/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileUploadPluginStartApi } from '@kbn/file-upload-plugin/public/api';

import type { Subscription } from 'rxjs';
import type { Observable } from 'rxjs';
import { switchMap, combineLatest, BehaviorSubject, of } from 'rxjs';
import type {
  AnalyticsServiceStart,
  // CoreStart,
  HttpSetup,
  NotificationsStart,
} from '@kbn/core/public';
import type { IImporter } from '@kbn/file-upload-plugin/public/importer/types';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { AbortError, FileUploadTelemetryService } from '@kbn/file-upload-common';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';

import type {
  FileUploadResults,
  FindFileStructureResponse,
  IngestPipeline,
  InitializeImportResponse,
  InputOverrides,
} from '@kbn/file-upload-common';
import { isEqual } from 'lodash';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FileAnalysis } from './file_wrapper';
import { FileWrapper } from './file_wrapper';

import type { FileClash } from './merge_tools';
import {
  CLASH_ERROR_TYPE,
  createMergedMappings,
  getFormatClashes,
  getMappingClashInfo,
} from './merge_tools';

import { AutoDeploy } from './auto_deploy';
import { createUrlOverrides } from '../src/utils';
import { DocCountService } from './doc_count_service';

export enum STATUS {
  NA,
  NOT_STARTED,
  STARTED,
  COMPLETED,
  FAILED,
  ABORTED,
}

export interface Dependencies {
  analytics: AnalyticsServiceStart;
  data: DataPublicPluginStart;
  fileUpload: FileUploadPluginStartApi;
  http: HttpSetup;
  notifications: NotificationsStart;
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
  errors: Array<{ title: string; error: any }>;
  totalDocs: number;
  totalFailedDocs: number;
}

export class FileUploadManager {
  private uploadSessionId: string;
  private http: HttpSetup;
  private data: DataPublicPluginStart;
  private fileUpload: FileUploadPluginStartApi;
  private notifications: NotificationsStart;
  private readonly files$ = new BehaviorSubject<FileWrapper[]>([]);
  private readonly analysisValid$ = new BehaviorSubject<boolean>(false);
  public readonly fileAnalysisStatus$: Observable<FileAnalysis[]> = this.files$.pipe(
    switchMap((files) =>
      files.length > 0 ? combineLatest(files.map((file) => file.fileStatus$)) : of([])
    )
  );
  public readonly filePipelines$: Observable<Array<IngestPipeline | undefined>> = this.files$.pipe(
    switchMap((files) =>
      files.length > 0 ? combineLatest(files.map((file) => file.pipelineObvs$)) : of([])
    )
  );
  private readonly existingIndexMappings$ = new BehaviorSubject<MappingTypeMapping | null>(null);

  private mappingsCheckSubscription: Subscription;
  private progressSubscription: Subscription;
  private readonly _settings$ = new BehaviorSubject<Config<IndicesIndexSettings>>({
    json: {},
    valid: false,
  });
  public readonly settings$ = this._settings$.asObservable();

  private readonly _mappings$ = new BehaviorSubject<Config<MappingTypeMapping>>({
    json: {},
    valid: false,
  });
  public readonly mappings$ = this._mappings$.asObservable();

  private readonly _existingIndexName$ = new BehaviorSubject<string | null>(null);
  public readonly existingIndexName$ = this._existingIndexName$.asObservable();

  private inferenceId: string | null = null;
  private importer: IImporter | null = null;
  private timeFieldName: string | undefined | null = null;
  private commonFileFormat: string | null = null;
  private docCountService: DocCountService;
  private initializedWithExistingIndex: boolean = false;
  private fileUploadTelemetryService: FileUploadTelemetryService;
  private importAbortController: AbortController | null = null;

  private readonly _uploadStatus$ = new BehaviorSubject<UploadStatus>({
    analysisStatus: STATUS.NOT_STARTED,
    overallImportStatus: STATUS.NOT_STARTED,
    indexCreated: STATUS.NOT_STARTED,
    pipelineCreated: STATUS.NOT_STARTED,
    modelDeployed: STATUS.NA,
    dataViewCreated: STATUS.NOT_STARTED,
    pipelinesDeleted: STATUS.NOT_STARTED,
    fileImport: STATUS.NOT_STARTED,
    filesStatus: [],
    fileClashes: [],
    formatMix: false,
    mappingsJsonValid: true,
    settingsJsonValid: true,
    pipelinesJsonValid: true,
    indexSearchable: false,
    allDocsSearchable: false,
    errors: [],
    overallImportProgress: 0,
    totalDocs: 0,
    totalFailedDocs: 0,
  });
  public readonly uploadStatus$ = this._uploadStatus$.asObservable();

  private autoAddSemanticTextField: boolean = false;

  constructor(
    dependencies: Dependencies,
    private autoAddInferenceEndpointName: string | null = null,
    private autoCreateDataView: boolean = true,
    private removePipelinesAfterImport: boolean = true,
    existingIndexName: string | null = null,
    indexSettingsOverride: IndicesIndexSettings | undefined = undefined,
    location: string | null = null,
    onIndexSearchable?: (indexName: string) => void,
    onAllDocsSearchable?: (indexName: string) => void
  ) {
    this.data = dependencies.data;
    this.fileUpload = dependencies.fileUpload;
    this.http = dependencies.http;
    this.notifications = dependencies.notifications;

    this.uploadSessionId = FileUploadTelemetryService.generateId();
    this.setExistingIndexName(existingIndexName);
    this.initializedWithExistingIndex = existingIndexName !== null;

    this.autoAddSemanticTextField = this.autoAddInferenceEndpointName !== null;
    this.updateSettings(indexSettingsOverride ?? {});
    this.docCountService = new DocCountService(
      this.fileUpload,
      (indexName) => {
        this.setStatus({
          indexSearchable: true,
        });
        if (onIndexSearchable) {
          onIndexSearchable(indexName);
        }
      },
      (indexName) => {
        this.setStatus({
          allDocsSearchable: true,
        });
        if (onAllDocsSearchable) {
          onAllDocsSearchable(indexName);
        }
      }
    );

    this.fileUploadTelemetryService = new FileUploadTelemetryService(
      dependencies.analytics,
      location ?? 'unknown'
    );

    this.mappingsCheckSubscription = combineLatest([
      this.fileAnalysisStatus$,
      this.existingIndexMappings$,
    ]).subscribe(([statuses, existingIndexMappings]) => {
      const allFilesAnalyzed = statuses.every((status) => status.loaded);
      const isExistingMappingsReady =
        this.getExistingIndexName() === null || existingIndexMappings !== null;

      if (allFilesAnalyzed && isExistingMappingsReady) {
        this.setStatus({
          analysisStatus: STATUS.STARTED,
        });

        this.analysisValid$.next(true);
        const uploadStatus = this._uploadStatus$.getValue();
        if (uploadStatus.overallImportStatus === STATUS.STARTED) {
          return;
        }
        const files = this.getFiles();

        if (files.length === 0) {
          this.setStatus({
            fileClashes: [],
            analysisStatus: STATUS.NOT_STARTED,
          });
          return;
        }

        const { formatsOk, fileClashes } = this.getFormatClashes();

        const { mappingClashes, mergedMappings, existingIndexChecks } = createMergedMappings(
          files,
          this.existingIndexMappings$.getValue() as FindFileStructureResponse['mappings']
        );

        let mappingsOk = mappingClashes.length === 0;
        if (existingIndexChecks !== undefined) {
          mappingsOk = mappingsOk && existingIndexChecks.mappingClashes.length === 0;
        }

        const fileSizesOk = statuses.every((status) => status.fileTooLarge === false);

        if (mappingsOk && formatsOk) {
          this.updateMappings(mergedMappings);
          this.addSemanticTextField();
        }

        this.setStatus({
          fileClashes:
            formatsOk === false
              ? fileClashes
              : getMappingClashInfo(mappingClashes, existingIndexChecks, statuses),
          analysisStatus: mappingsOk && formatsOk && fileSizesOk ? STATUS.COMPLETED : STATUS.FAILED,
          pipelinesJsonValid: this.allPipelinesValid(),
        });
      }
    });

    // Track overall import progress across files
    this.progressSubscription = this.fileAnalysisStatus$.subscribe((statuses) => {
      if (statuses.length === 0) {
        this.setStatus({ overallImportProgress: 0 });
        return;
      }

      const totalProgress = statuses.reduce((sum, s) => sum + (s.importProgress ?? 0), 0);
      // Normalize to a 0-100 scale by averaging across files
      const normalized = Math.round(totalProgress / statuses.length);

      this.setStatus({ overallImportProgress: normalized });
    });
  }

  destroy() {
    this.importAbortController?.abort();
    this.getFiles().forEach((file) => file.destroy());

    this.files$.complete();
    this.analysisValid$.complete();
    this._settings$.complete();
    this._mappings$.complete();
    this.existingIndexMappings$.complete();
    this._uploadStatus$.complete();
    this.mappingsCheckSubscription.unsubscribe();
    this.docCountService.destroy();
    this.progressSubscription.unsubscribe();
  }
  private setStatus(status: Partial<UploadStatus>) {
    this._uploadStatus$.next({
      ...this._uploadStatus$.getValue(),
      ...status,
    });
  }

  async addFiles(fileList: FileList | File[]) {
    this.setStatus({
      analysisStatus: STATUS.STARTED,
    });
    const arrayOfFiles = Array.isArray(fileList) ? fileList : Array.from(fileList);
    const promises = arrayOfFiles.map((file) => this.addFile(file));
    await Promise.all(promises);
  }

  async addFile(file: File) {
    const f = new FileWrapper(
      file,
      this.fileUpload,
      this.data,
      this.fileUploadTelemetryService,
      this.uploadSessionId
    );
    const files = this.getFiles();
    files.push(f);
    this.files$.next(files);
    await f.analyzeFile();
  }

  async removeFile(index: number) {
    const files = this.getFiles();
    const f = files[index];
    files.splice(index, 1);
    this.files$.next(files);
    if (f) {
      f.destroy();
    }
    if (files.length === 0) {
      this.setStatus({
        analysisStatus: STATUS.NOT_STARTED,
      });
    }
  }

  async abortAnalysis() {
    const files = this.getFiles();
    files.forEach((file) => file.abortAnalysis());
  }

  async abortImport() {
    if (this.importAbortController) {
      this.importAbortController.abort();
    }
  }

  /**
   * Removes files that have clashing mappings and cannot be imported together.
   * Files marked with ERROR clash type will be removed from the file list.
   */
  public async removeClashingFiles() {
    const fileClashes = this._uploadStatus$.getValue().fileClashes;
    const filesToDestroy: FileWrapper[] = [];
    const files = this.getFiles();
    const newFiles = files.filter((file, i) => {
      if (fileClashes[i].clash === CLASH_ERROR_TYPE.ERROR) {
        filesToDestroy.push(files[i]);
        return false;
      }
      return true;
    });

    this.files$.next(newFiles);

    filesToDestroy.forEach((file) => {
      file.destroy();
    });
  }

  /**
   * Creates a function to analyze a file at the specified index with custom overrides.
   * @param index - The index of the file to analyze
   * @returns A function that accepts overrides and performs the file analysis
   */
  public analyzeFileWithOverrides(index: number) {
    return async (overrides: InputOverrides) => {
      const files = this.getFiles();
      const file = files[index];
      if (file) {
        const formattedOverrides = createUrlOverrides(overrides, {});
        await file.analyzeFile(formattedOverrides);
      }
    };
  }

  /**
   * Gets the current upload status including file clashes, analysis status, and import progress.
   * @returns The current upload status
   */
  public getUploadStatus() {
    return this._uploadStatus$.getValue();
  }

  /**
   * Checks if the file upload manager was initialized with an existing index.
   * @returns True if initialized with an existing index, false otherwise
   */
  public getInitializedWithExistingIndex() {
    return this.initializedWithExistingIndex;
  }

  /**
   * Gets the name of the existing index being used for import.
   * @returns The existing index name or null if none is set
   */
  public getExistingIndexName() {
    return this._existingIndexName$.getValue();
  }

  /**
   * Sets the existing index name and resets the analysis status.
   * @param name - The index name to set, or null to clear
   */
  public setExistingIndexName(name: string | null) {
    this.setStatus({
      analysisStatus: STATUS.NOT_STARTED,
    });
    this._existingIndexName$.next(name);
    if (name === null) {
      this.existingIndexMappings$.next(null);
      this.autoCreateDataView = true;
    } else {
      this.loadExistingIndexMappings();
      this.autoCreateDataView = false;
    }
  }

  /**
   * Checks if this upload is targeting an existing index.
   * @returns True if uploading to an existing index, false otherwise
   */
  public isExistingIndexUpload() {
    return this.getExistingIndexName() !== null;
  }

  /**
   * Gets the current array of file wrappers being managed.
   * @returns Array of FileWrapper instances
   */
  public getFiles() {
    return this.files$.getValue();
  }

  private getFileClashes(index: number): () => FileClash | null {
    return () => {
      const uploadStatus = this._uploadStatus$.getValue();
      return uploadStatus.fileClashes[index] ?? null;
    };
  }
  private getFileClashTotals() {
    return this._uploadStatus$.getValue().fileClashes.reduce(
      (acc, clash) => {
        acc.mappingClashTotalMissingFields += clash.missingFields?.length ?? 0;
        acc.mappingClashTotalNewFields += clash.newFields?.length ?? 0;
        return acc;
      },
      { mappingClashTotalNewFields: 0, mappingClashTotalMissingFields: 0 }
    );
  }

  private getFormatClashes(): {
    formatsOk: boolean;
    fileClashes: FileClash[];
  } {
    const files = this.getFiles();
    const fileClashes = getFormatClashes(files);
    const formatsOk = fileClashes.every((file) => file.clash === CLASH_ERROR_TYPE.NONE);

    if (formatsOk) {
      this.commonFileFormat = formatsOk ? files[0].getStatus().results!.format : null;
    }
    return {
      formatsOk,
      fileClashes,
    };
  }

  private getPipelines(): Array<IngestPipeline | undefined> {
    const files = this.getFiles();
    return files.map((file) => file.getPipeline());
  }

  private allPipelinesValid() {
    const files = this.getFiles();
    return files.every((file) => file.isPipelineValid());
  }

  public updatePipeline(index: number) {
    return (pipeline: string) => {
      const files = this.getFiles();
      files[index].updatePipeline(pipeline);
    };
  }

  /**
   * Updates the pipelines for all files with the provided array.
   * @param pipelines - Array of pipelines corresponding to each file
   */
  public updatePipelines(pipelines: Array<IngestPipeline | undefined>) {
    const files = this.getFiles();
    files.forEach((file, i) => {
      file.setPipeline(pipelines[i]);
    });
  }

  /**
   * Gets the current index mappings.
   * @returns The current mappings configuration
   */
  public getMappings() {
    return this._mappings$.getValue();
  }

  /**
   * Updates the index mappings configuration.
   * @param mappings - New mappings as object or JSON string
   */
  public updateMappings(mappings: MappingTypeMapping | string) {
    this.updateSettingsOrMappings('mappings', mappings);
  }

  /**
   * Gets the current index settings.
   * @returns The current index settings configuration
   */
  public getSettings() {
    return this._settings$.getValue();
  }

  /**
   * Updates the index settings configuration.
   * @param settings - New settings as object or JSON string
   */
  public updateSettings(settings: IndicesIndexSettings | string) {
    this.updateSettingsOrMappings('settings', settings);
  }

  private updateSettingsOrMappings(
    mode: 'settings' | 'mappings',
    config: IndicesIndexSettings | MappingTypeMapping | string
  ) {
    const config$ = mode === 'settings' ? this._settings$ : this._mappings$;
    const jsonValidKey = mode === 'settings' ? 'settingsJsonValid' : 'mappingsJsonValid';
    const currentConfig = config$.getValue();
    if (typeof config === 'string') {
      try {
        const json = JSON.parse(config);

        this.setStatus({
          [jsonValidKey]: true,
        });

        if (isEqual(currentConfig.json, json)) {
          return;
        }

        config$.next({
          json,
          valid: true,
        });
      } catch (e) {
        this.setStatus({
          [jsonValidKey]: false,
        });
        return;
      }
    } else {
      config$.next({
        json: config,
        valid: true,
      });
    }
  }

  /**
   * Gets whether a data view should be automatically created after import.
   * @returns True if auto-creating data view, false otherwise
   */
  public getAutoCreateDataView() {
    return this.autoCreateDataView;
  }

  /**
   * Imports all files into the specified index with optional data view creation.
   * @param indexName - Name of the target index
   * @param dataViewName - Optional name for the data view to create
   * @returns Promise resolving to import results or null if cancelled
   */
  public async import(
    indexName: string,
    dataViewName?: string | null
  ): Promise<FileUploadResults | null> {
    this.importAbortController = new AbortController();
    const signal = this.importAbortController.signal;

    const mappings = this.getMappings().json;
    const pipelines = this.getPipelines();

    const isExistingIndex = this.isExistingIndexUpload();
    const files = this.getFiles();
    const { sendTelemetry } = this.sendTelemetryProvider(
      files,
      new Date().getTime(),
      isExistingIndex,
      dataViewName
    );
    const { checkImportAborted } = this.checkImportAbortedProvider(sendTelemetry);

    if (mappings === null || pipelines === null || this.commonFileFormat === null) {
      this.setStatus({
        overallImportStatus: STATUS.FAILED,
      });

      sendTelemetry(false);
      return null;
    }

    this.setStatus({
      overallImportStatus: STATUS.STARTED,
      dataViewCreated:
        this.autoCreateDataView && dataViewName !== null ? STATUS.NOT_STARTED : STATUS.NA,
    });

    this.importer = await this.fileUpload.importerFactory(this.commonFileFormat, {});
    this.inferenceId = getInferenceId(mappings);

    if (this.inferenceId !== null) {
      this.setStatus({
        modelDeployed: STATUS.NOT_STARTED,
      });
      this.setStatus({
        modelDeployed: STATUS.STARTED,
      });
      await this.autoDeploy(signal);
      this.setStatus({
        modelDeployed: STATUS.COMPLETED,
      });
    }

    const createPipelines = pipelines.length > 0;

    this.setStatus({
      indexCreated: STATUS.STARTED,
      pipelineCreated: createPipelines ? STATUS.STARTED : STATUS.NA,
    });

    let indexCreated = false;
    let pipelinesCreated = false;
    let initializeImportResp: InitializeImportResponse | undefined;

    this.docCountService.resetInitialDocCount();

    if (isExistingIndex) {
      await this.docCountService.loadInitialIndexCount(indexName);
    }

    try {
      initializeImportResp = await this.importer.initializeImport(
        indexName,
        this.getSettings().json,
        mappings,
        pipelines,
        isExistingIndex,
        signal
      );

      checkImportAborted();

      this.docCountService.startIndexSearchableCheck(indexName);

      this.timeFieldName = this.importer.getTimeField();
      indexCreated = initializeImportResp.index !== undefined;
      pipelinesCreated = initializeImportResp.pipelineIds.length > 0;
      this.setStatus({
        indexCreated: indexCreated ? STATUS.COMPLETED : STATUS.FAILED,
        ...(createPipelines
          ? { pipelineCreated: pipelinesCreated ? STATUS.COMPLETED : STATUS.FAILED }
          : {}),
      });

      if (initializeImportResp.error) {
        throw initializeImportResp.error;
      }
    } catch (e) {
      checkImportAborted();

      this.setStatus({
        overallImportStatus: STATUS.FAILED,
        errors: [
          {
            title: i18n.translate('xpack.fileUpload.fileManager.errorInitializing', {
              defaultMessage: 'Error initializing index and ingest pipeline',
            }),
            error: e,
          },
        ],
      });
      sendTelemetry(false);

      return null;
    }

    if (
      indexCreated === false ||
      (createPipelines && pipelinesCreated === false) ||
      !initializeImportResp
    ) {
      sendTelemetry(false);
      return null;
    }

    this.setStatus({
      fileImport: STATUS.STARTED,
    });

    // import files
    const createdPipelineIds = initializeImportResp.pipelineIds;

    try {
      await Promise.all(
        files.map(async (file, i) => {
          await file.import(
            indexName,
            mappings!,
            createdPipelineIds[i] ?? undefined,
            this.getFileClashes(i), // passing in file clashes for telemetry
            signal
          );
        })
      );
    } catch (error) {
      this.setStatus({
        overallImportStatus: STATUS.FAILED,
        errors: [
          {
            title: i18n.translate('xpack.fileUpload.fileManager.errorImportingData', {
              defaultMessage: 'Error importing data',
            }),
            error,
          },
        ],
      });
      sendTelemetry(false);
      return null;
    }

    checkImportAborted();

    // Calculate document counts across all imported files
    const documentCounts = files.reduce(
      (totals, file) => {
        const { docCount, failures } = file.getStatus();
        totals.totalDocs += docCount;
        totals.totalDocFailures += failures.length;
        return totals;
      },
      {
        totalDocs: 0,
        totalDocFailures: 0,
      }
    );

    this.docCountService.startAllDocsSearchableCheck(
      indexName,
      documentCounts.totalDocs - documentCounts.totalDocFailures
    );

    this.setStatus({
      fileImport: STATUS.COMPLETED,
      totalDocs: documentCounts.totalDocs,
      totalFailedDocs: documentCounts.totalDocFailures,
    });

    if (this.removePipelinesAfterImport) {
      try {
        this.setStatus({
          pipelinesDeleted: STATUS.STARTED,
        });
        await this.importer.deletePipelines(signal);
        this.setStatus({
          pipelinesDeleted: STATUS.COMPLETED,
        });
      } catch (error) {
        this.setStatus({
          pipelinesDeleted: STATUS.FAILED,
          errors: [
            {
              title: i18n.translate('xpack.fileUpload.fileManager.errorDeletingPipelines', {
                defaultMessage: 'Error deleting pipelines',
              }),
              error,
            },
          ],
        });
      }
    }

    checkImportAborted();

    let dataViewResp;
    if (this.autoCreateDataView && dataViewName !== null) {
      this.setStatus({
        dataViewCreated: STATUS.STARTED,
      });
      const dataViewName2 = dataViewName === undefined ? indexName : dataViewName;
      dataViewResp = await createKibanaDataView(
        dataViewName2,
        this.data.dataViews,
        this.timeFieldName ?? undefined
      );
      if (dataViewResp.success === false) {
        this.setStatus({
          overallImportStatus: STATUS.FAILED,
          errors: [
            {
              title: i18n.translate('xpack.fileUpload.fileManager.errorCreatingDataView', {
                defaultMessage: 'Error creating data view',
              }),
              error: dataViewResp.error,
            },
          ],
        });
        sendTelemetry(false);
        return null;
      } else {
        this.setStatus({
          dataViewCreated: STATUS.COMPLETED,
        });
      }
    }

    checkImportAborted();

    this.setStatus({
      overallImportStatus: STATUS.COMPLETED,
    });

    sendTelemetry(true);

    this.importAbortController = null;

    return {
      index: indexName,
      dataView: dataViewResp ? { id: dataViewResp.id!, title: dataViewResp.title! } : undefined,
      inferenceId: this.inferenceId ?? undefined,
      timeFieldName: this.timeFieldName ?? undefined,
      files: this.getFiles().map((file) => {
        const status = file.getStatus();
        return {
          fileName: status.fileName,
          docCount: status.docCount,
          fileFormat: status.results!.format,
          documentType: status.results!.document_type!,
        };
      }),
    };
  }

  private async autoDeploy(signal?: AbortSignal) {
    if (this.inferenceId === null) {
      return;
    }
    try {
      const autoDeploy = new AutoDeploy(this.http, this.inferenceId);
      await autoDeploy.deploy(signal);
    } catch (error) {
      this.setStatus({
        modelDeployed: STATUS.FAILED,
        errors: [
          {
            title: i18n.translate('xpack.fileUpload.fileManager.errorDeployingModel', {
              defaultMessage: 'Error deploying model',
            }),
            error,
          },
        ],
      });
    }
  }

  private isTikaFormat() {
    return this.commonFileFormat === 'tika';
  }

  private addSemanticTextField() {
    const mappings = this.getMappings().json;
    const pipelines = this.getPipelines();
    if (
      this.isTikaFormat() &&
      this.autoAddSemanticTextField &&
      this.autoAddInferenceEndpointName !== null &&
      pipelines !== null &&
      mappings !== null
    ) {
      mappings.properties!.content = {
        type: 'semantic_text',
        inference_id: this.autoAddInferenceEndpointName,
      };

      pipelines.forEach((pipeline) => {
        if (pipeline === undefined || pipeline.processors === undefined) {
          return;
        }
        pipeline.processors.push({
          set: {
            field: 'content',
            copy_from: 'attachment.content',
          },
        });
      });
      this.updateMappings(mappings);
      this.updatePipelines(pipelines);
    }
  }

  private async loadExistingIndexMappings() {
    const existingIndexName = this.getExistingIndexName();
    if (existingIndexName === null) {
      return;
    }
    try {
      const { mappings } = await this.http.fetch<{ mappings: MappingTypeMapping }>(
        `/api/index_management/mapping/${existingIndexName}`,
        {
          method: 'GET',
          version: '1',
        }
      );

      this.existingIndexMappings$.next(mappings);
    } catch (e) {
      this.existingIndexMappings$.next(null);
      this.notifications.toasts.addError(e, {
        title: i18n.translate('xpack.fileUpload.fileManager.errorLoadingExistingMappings', {
          defaultMessage: 'Error loading existing index mappings for {indexName}',
          values: { indexName: existingIndexName },
        }),
      });
    }
  }

  /**
   * Renames target fields in CSV processors across all file pipelines.
   * @param changes - Array of field name changes to apply
   */
  public renamePipelineTargetFields(
    changes: {
      oldName: string;
      newName: string;
    }[]
  ) {
    // Filter out changes where oldName equals newName (no actual difference)
    const actualChanges = changes.filter((change) => change.oldName !== change.newName);

    if (actualChanges.length === 0) {
      return;
    }

    // Update pipeline configurations for all files
    const files = this.getFiles();
    for (const file of files) {
      file.renameTargetFields(actualChanges);
    }
  }

  /**
   * Removes all convert processors from all file pipelines.
   */
  public removeConvertProcessors() {
    const files = this.getFiles();
    for (const file of files) {
      file.removeConvertProcessors();
    }
  }

  /**
   * Updates date field processors in all file pipelines based on current mappings.
   * @param mappings - Current index mappings to validate against
   */
  public updateDateFields(mappings: MappingTypeMapping) {
    const files = this.getFiles();
    for (const file of files) {
      file.updateDateField(mappings);
    }
  }

  private sendTelemetryProvider(
    files: FileWrapper[],
    startTime: number,
    isExistingIndex: boolean,
    dataViewName: string | null | undefined
  ) {
    return {
      sendTelemetry: (success: boolean) => {
        const containsAutoAddedSemanticTextField =
          this.getMappings().json.properties?.content?.type === 'semantic_text';

        const { mappingClashTotalNewFields, mappingClashTotalMissingFields } =
          this.getFileClashTotals();

        this.fileUploadTelemetryService.trackUploadSession({
          upload_session_id: this.uploadSessionId,
          total_files: files.length,
          total_size_bytes: files.reduce((acc, file) => acc + file.getSizeInBytes(), 0),
          session_success: success,
          session_cancelled: this.importAbortController?.signal.aborted ?? false,
          session_time_ms: new Date().getTime() - startTime,
          new_index_created: isExistingIndex === false,
          data_view_created: this.autoCreateDataView && dataViewName !== null,
          mapping_clash_total_new_fields: mappingClashTotalNewFields,
          mapping_clash_total_missing_fields: mappingClashTotalMissingFields,
          contains_auto_added_semantic_text_field: containsAutoAddedSemanticTextField,
        });
      },
    };
  }

  private checkImportAbortedProvider(
    sendTelemetry: (success: boolean, cancelled?: boolean) => void
  ) {
    return {
      checkImportAborted: () => {
        if (this.importAbortController?.signal.aborted) {
          this.setStatus({ overallImportStatus: STATUS.ABORTED });
          const { modelDeployed, indexCreated, pipelineCreated, fileImport, dataViewCreated } =
            this._uploadStatus$.getValue();
          this.setStatus({
            modelDeployed:
              modelDeployed === STATUS.STARTED || modelDeployed === STATUS.NOT_STARTED
                ? STATUS.ABORTED
                : modelDeployed,
            indexCreated:
              indexCreated === STATUS.STARTED || indexCreated === STATUS.NOT_STARTED
                ? STATUS.ABORTED
                : indexCreated,
            pipelineCreated:
              pipelineCreated === STATUS.STARTED || pipelineCreated === STATUS.NOT_STARTED
                ? STATUS.ABORTED
                : pipelineCreated,
            fileImport:
              fileImport === STATUS.STARTED || fileImport === STATUS.NOT_STARTED
                ? STATUS.ABORTED
                : fileImport,
            dataViewCreated:
              dataViewCreated === STATUS.STARTED || dataViewCreated === STATUS.NOT_STARTED
                ? STATUS.ABORTED
                : dataViewCreated,
          });

          sendTelemetry(false);

          throw new AbortError();
        }
      },
    };
  }
}

export async function createKibanaDataView(
  dataViewName: string,
  dataViewsContract: DataViewsServicePublic,
  timeFieldName?: string
) {
  try {
    const emptyPattern = await dataViewsContract.createAndSave({
      title: dataViewName,
      timeFieldName,
    });

    return {
      success: true,
      id: emptyPattern.id,
    };
  } catch (error) {
    return {
      success: false,
      error,
      id: undefined,
      title: undefined,
    };
  }
}

export function getInferenceId(mappings: MappingTypeMapping) {
  for (const value of Object.values(mappings.properties ?? {})) {
    if (value.type === 'semantic_text' && value.inference_id) {
      return value.inference_id;
    }
  }
  return null;
}

export function semanticTextFieldExists(mappings: MappingTypeMapping) {
  return Object.values(mappings.properties ?? {}).some((value) => value.type === 'semantic_text');
}
