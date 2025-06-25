/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';

import type { Subscription } from 'rxjs';
import type { Observable } from 'rxjs';
import { switchMap, combineLatest, BehaviorSubject, of } from 'rxjs';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { IImporter } from '@kbn/file-upload-plugin/public/importer/types';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type {
  FindFileStructureResponse,
  IngestPipeline,
  InitializeImportResponse,
  InputOverrides,
} from '@kbn/file-upload-plugin/common/types';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';

import { FileUploadResults } from '@kbn/file-upload-common';
import { isEqual } from 'lodash';
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

export enum STATUS {
  NA,
  NOT_STARTED,
  STARTED,
  COMPLETED,
  FAILED,
}

export interface Config<T = IndicesIndexSettings | MappingTypeMapping> {
  json: T;
  valid: boolean;
}

export interface UploadStatus {
  analysisStatus: STATUS;
  overallImportStatus: STATUS;
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
  errors: Array<{ title: string; error: any }>;
}

export class FileUploadManager {
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
    errors: [],
  });
  public readonly uploadStatus$ = this._uploadStatus$.asObservable();

  private autoAddSemanticTextField: boolean = false;

  constructor(
    private fileUpload: FileUploadStartApi,
    private http: HttpSetup,
    private dataViewsContract: DataViewsServicePublic,
    private notifications: NotificationsStart,
    private autoAddInferenceEndpointName: string | null = null,
    private autoCreateDataView: boolean = true,
    private removePipelinesAfterImport: boolean = true,
    existingIndexName: string | null = null,
    indexSettingsOverride: IndicesIndexSettings | undefined = undefined
  ) {
    this.setExistingIndexName(existingIndexName);

    this.autoAddSemanticTextField = this.autoAddInferenceEndpointName !== null;
    this.updateSettings(indexSettingsOverride ?? {});

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
  }

  destroy() {
    this.files$.complete();
    this.analysisValid$.complete();
    this._settings$.complete();
    this._mappings$.complete();
    this.existingIndexMappings$.complete();
    this._uploadStatus$.complete();
    this.mappingsCheckSubscription.unsubscribe();
  }
  private setStatus(status: Partial<UploadStatus>) {
    this._uploadStatus$.next({
      ...this._uploadStatus$.getValue(),
      ...status,
    });
  }

  async addFiles(fileList: FileList) {
    this.setStatus({
      analysisStatus: STATUS.STARTED,
    });
    const promises = Array.from(fileList).map((file) => this.addFile(file));
    await Promise.all(promises);
  }

  async addFile(file: File) {
    const f = new FileWrapper(file, this.fileUpload);
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

  public getUploadStatus() {
    return this._uploadStatus$.getValue();
  }

  public getExistingIndexName() {
    return this._existingIndexName$.getValue();
  }
  public setExistingIndexName(name: string | null) {
    this.setStatus({
      analysisStatus: STATUS.NOT_STARTED,
    });
    this._existingIndexName$.next(name);
    if (name === null) {
      this.existingIndexMappings$.next(null);
    } else {
      this.loadExistingIndexMappings();
      this.autoCreateDataView = false;
    }
  }

  public isExistingIndexUpload() {
    return this.getExistingIndexName() !== null;
  }

  public getFiles() {
    return this.files$.getValue();
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

  public updatePipelines(pipelines: Array<IngestPipeline | undefined>) {
    const files = this.getFiles();
    files.forEach((file, i) => {
      file.setPipeline(pipelines[i]);
    });
  }

  public getMappings() {
    return this._mappings$.getValue();
  }

  public updateMappings(mappings: MappingTypeMapping | string) {
    this.updateSettingsOrMappings('mappings', mappings);
  }

  public getSettings() {
    return this._settings$.getValue();
  }

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

  public getAutoCreateDataView() {
    return this.autoCreateDataView;
  }

  public async import(
    indexName: string,
    dataViewName?: string | null
  ): Promise<FileUploadResults | null> {
    const mappings = this.getMappings().json;
    const pipelines = this.getPipelines();

    if (mappings === null || pipelines === null || this.commonFileFormat === null) {
      this.setStatus({
        overallImportStatus: STATUS.FAILED,
      });

      return null;
    }

    this.setStatus({
      overallImportStatus: STATUS.STARTED,
      dataViewCreated: this.autoCreateDataView ? STATUS.NOT_STARTED : STATUS.NA,
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
      await this.autoDeploy();
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

    try {
      initializeImportResp = await this.importer.initializeImport(
        indexName,
        this.getSettings().json,
        mappings,
        pipelines,
        this.isExistingIndexUpload()
      );
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
      this.setStatus({
        overallImportStatus: STATUS.FAILED,
        errors: [
          {
            title: i18n.translate('xpack.dataVisualizer.file.fileManager.errorInitializing', {
              defaultMessage: 'Error initializing index and ingest pipeline',
            }),
            error: e,
          },
        ],
      });
      return null;
    }

    if (
      indexCreated === false ||
      (createPipelines && pipelinesCreated === false) ||
      !initializeImportResp
    ) {
      return null;
    }

    this.setStatus({
      fileImport: STATUS.STARTED,
    });

    // import data
    const files = this.getFiles();
    const createdPipelineIds = initializeImportResp.pipelineIds;

    try {
      await Promise.all(
        files.map(async (file, i) => {
          await file.import(indexName, mappings!, createdPipelineIds[i] ?? undefined);
        })
      );
    } catch (error) {
      this.setStatus({
        overallImportStatus: STATUS.FAILED,
        errors: [
          {
            title: i18n.translate('xpack.dataVisualizer.file.fileManager.errorImportingData', {
              defaultMessage: 'Error importing data',
            }),
            error,
          },
        ],
      });
      return null;
    }

    this.setStatus({
      fileImport: STATUS.COMPLETED,
    });

    if (this.removePipelinesAfterImport) {
      try {
        this.setStatus({
          pipelinesDeleted: STATUS.STARTED,
        });
        await this.importer.deletePipelines();
        this.setStatus({
          pipelinesDeleted: STATUS.COMPLETED,
        });
      } catch (error) {
        this.setStatus({
          pipelinesDeleted: STATUS.FAILED,
          errors: [
            {
              title: i18n.translate(
                'xpack.dataVisualizer.file.fileManager.errorDeletingPipelines',
                {
                  defaultMessage: 'Error deleting pipelines',
                }
              ),
              error,
            },
          ],
        });
      }
    }

    let dataViewResp;
    if (this.autoCreateDataView && dataViewName !== null) {
      this.setStatus({
        dataViewCreated: STATUS.STARTED,
      });
      const dataViewName2 = dataViewName === undefined ? indexName : dataViewName;
      dataViewResp = await createKibanaDataView(
        dataViewName2,
        this.dataViewsContract,
        this.timeFieldName ?? undefined
      );
      if (dataViewResp.success === false) {
        this.setStatus({
          overallImportStatus: STATUS.FAILED,
          errors: [
            {
              title: i18n.translate('xpack.dataVisualizer.file.fileManager.errorCreatingDataView', {
                defaultMessage: 'Error creating data view',
              }),
              error: dataViewResp.error,
            },
          ],
        });
        return null;
      } else {
        this.setStatus({
          dataViewCreated: STATUS.COMPLETED,
        });
      }
    }

    this.setStatus({
      overallImportStatus: STATUS.COMPLETED,
    });

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

  private async autoDeploy() {
    if (this.inferenceId === null) {
      return;
    }
    try {
      const autoDeploy = new AutoDeploy(this.http, this.inferenceId);
      await autoDeploy.deploy();
    } catch (error) {
      this.setStatus({
        modelDeployed: STATUS.FAILED,
        errors: [
          {
            title: i18n.translate('xpack.dataVisualizer.file.fileManager.errorDeployingModel', {
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
        if (pipeline === undefined) {
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
        title: i18n.translate(
          'xpack.dataVisualizer.file.fileManager.errorLoadingExistingMappings',
          {
            defaultMessage: 'Error loading existing index mappings for {indexName}',
            values: { indexName: existingIndexName },
          }
        ),
      });
    }
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
