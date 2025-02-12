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
import type { HttpSetup } from '@kbn/core/public';
import type { IImporter } from '@kbn/file-upload-plugin/public/importer/types';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { ImportResponse, IngestPipeline } from '@kbn/file-upload-plugin/common/types';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import type { FileUploadResults } from '@kbn/file-upload-common';
import type { FileAnalysis } from './file_wrapper';
import { FileWrapper } from './file_wrapper';
import {
  createKibanaDataView,
  getInferenceId,
} from '../../application/file_data_visualizer/components/import_view/import';
import { AutoDeploy } from '../../application/file_data_visualizer/components/import_view/auto_deploy';
import type { FileClash } from './merge_tools';
import { createMergedMappings, getFormatClashes, getMappingClashInfo } from './merge_tools';

export enum STATUS {
  NA,
  NOT_STARTED,
  STARTED,
  COMPLETED,
  FAILED,
}

export interface UploadStatus {
  analysisOk: boolean;
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
  errors: Array<{ title: string; error: any }>;
}

export class FileManager {
  private readonly files$ = new BehaviorSubject<FileWrapper[]>([]);
  private readonly analysisValid$ = new BehaviorSubject<boolean>(false);
  public readonly fileAnalysisStatus$: Observable<FileAnalysis[]> = this.files$.pipe(
    switchMap((files) =>
      files.length > 0 ? combineLatest(files.map((file) => file.fileStatus$)) : of([])
    )
  );
  private mappingsCheckSubscription: Subscription;
  private settings;
  private mappings: MappingTypeMapping | null = null;
  private pipelines: IngestPipeline[] | null = null;
  private inferenceId: string | null = null;
  private importer: IImporter | null = null;
  private timeFieldName: string | undefined | null = null;
  private commonFileFormat: string | null = null;

  public readonly uploadStatus$ = new BehaviorSubject<UploadStatus>({
    analysisOk: false,
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
    errors: [],
  });
  private autoAddSemanticTextField: boolean = false;

  constructor(
    private fileUpload: FileUploadStartApi,
    private http: HttpSetup,
    private dataViewsContract: DataViewsServicePublic,
    private autoAddInferenceEndpointName: string | null = null,
    private autoCreateDataView: boolean = true,
    private removePipelinesAfterImport: boolean = true,
    indexSettingsOverride: IndicesIndexSettings | undefined = undefined
  ) {
    this.autoAddSemanticTextField = this.autoAddInferenceEndpointName !== null;
    this.settings = indexSettingsOverride ?? {};

    this.mappingsCheckSubscription = this.fileAnalysisStatus$.subscribe((statuses) => {
      const allFilesAnalyzed = statuses.every((status) => status.loaded);
      if (allFilesAnalyzed) {
        this.analysisValid$.next(true);
        const uploadStatus = this.uploadStatus$.getValue();
        if (uploadStatus.fileImport === STATUS.STARTED) {
          return;
        }
        if (this.getFiles().length === 0) {
          this.setStatus({
            fileClashes: [],
          });
          return;
        }

        const { formatsOk, fileClashes } = this.getFormatClashes();
        const { mappingClashes, mergedMappings } = this.createMergedMappings();
        const mappingsOk = mappingClashes.length === 0;
        if (formatsOk === false) {
          this.setStatus({
            fileClashes,
          });
        } else if (mappingsOk) {
          this.mappings = mergedMappings;
          this.pipelines = this.getPipelines();
          this.addSemanticTextField();
          this.setStatus({
            fileClashes: [],
          });
        } else {
          this.setStatus({
            fileClashes: getMappingClashInfo(mappingClashes, statuses),
          });
        }
        this.setStatus({
          analysisOk: mappingsOk && formatsOk,
        });
      }
    });
  }

  destroy() {
    this.files$.complete();
    this.mappingsCheckSubscription.unsubscribe();
  }
  private setStatus(status: Partial<UploadStatus>) {
    this.uploadStatus$.next({
      ...this.uploadStatus$.getValue(),
      ...status,
    });
  }

  async addFiles(fileList: FileList) {
    this.setStatus({
      analysisOk: false,
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
  }

  public async removeClashingFiles() {
    const fileClashes = this.uploadStatus$.getValue().fileClashes;
    const filesToDestroy: FileWrapper[] = [];
    const files = this.getFiles();
    const newFiles = files.filter((file, i) => {
      if (fileClashes[i].clash) {
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

  public getFiles() {
    return this.files$.getValue();
  }

  private getFormatClashes(): {
    formatsOk: boolean;
    fileClashes: FileClash[];
  } {
    const files = this.getFiles();
    const fileClashes = getFormatClashes(files);
    const formatsOk = fileClashes.every((file) => file.clash === false);

    if (formatsOk) {
      this.commonFileFormat = formatsOk ? files[0].getStatus().results!.format : null;
    }
    return {
      formatsOk,
      fileClashes,
    };
  }

  private createMergedMappings() {
    const files = this.getFiles();
    return createMergedMappings(files);
  }

  private getPipelines(): IngestPipeline[] {
    const files = this.getFiles();
    return files.map((file) => file.getPipeline());
  }

  public async import(indexName: string): Promise<FileUploadResults | null> {
    if (this.mappings === null || this.pipelines === null || this.commonFileFormat === null) {
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
    this.inferenceId = getInferenceId(this.mappings);

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

    this.setStatus({
      indexCreated: STATUS.STARTED,
      pipelineCreated: STATUS.STARTED,
    });

    let indexCreated = false;
    let pipelineCreated = false;
    let initializeImportResp: ImportResponse | undefined;

    try {
      initializeImportResp = await this.importer.initializeImport(
        indexName,
        this.settings,
        this.mappings,
        this.pipelines[0],
        this.pipelines
      );
      this.timeFieldName = this.importer.getTimeField();
      indexCreated = initializeImportResp.index !== undefined;
      pipelineCreated = initializeImportResp.pipelineId !== undefined;
      this.setStatus({
        indexCreated: indexCreated ? STATUS.COMPLETED : STATUS.FAILED,
        pipelineCreated: pipelineCreated ? STATUS.COMPLETED : STATUS.FAILED,
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

    if (!indexCreated || !pipelineCreated || !initializeImportResp) {
      return null;
    }

    this.setStatus({
      fileImport: STATUS.STARTED,
    });

    // import data
    const files = this.getFiles();

    try {
      await Promise.all(
        files.map(async (file, i) => {
          await file.import(
            initializeImportResp!.id,
            indexName,
            this.mappings!,
            `${indexName}-${i}-pipeline`
          );
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
        await this.importer.deletePipelines(
          this.pipelines.map((p, i) => `${indexName}-${i}-pipeline`)
        );
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

    const dataView = '';
    let dataViewResp;
    if (this.autoCreateDataView) {
      this.setStatus({
        dataViewCreated: STATUS.STARTED,
      });
      const dataViewName = dataView === '' ? indexName : dataView;
      dataViewResp = await createKibanaDataView(
        dataViewName,
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
      dataView: dataViewResp ? { id: dataViewResp.id!, title: dataView! } : undefined,
      inferenceId: this.inferenceId ?? undefined,
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
    if (
      this.isTikaFormat() &&
      this.autoAddSemanticTextField &&
      this.autoAddInferenceEndpointName !== null &&
      this.pipelines !== null &&
      this.mappings !== null
    ) {
      this.mappings.properties!.content = {
        type: 'semantic_text',
        inference_id: this.autoAddInferenceEndpointName,
      };

      this.pipelines.forEach((pipeline) => {
        pipeline.processors.push({
          set: {
            field: 'content',
            copy_from: 'attachment.content',
          },
        });
      });
    }
  }
}
