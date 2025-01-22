/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';

import type { Subscription } from 'rxjs';
import { Observable } from 'rxjs';
import { switchMap, combineLatest, BehaviorSubject } from 'rxjs';
// import { BehaviorSubject } from 'rxjs';
import type { HttpSetup } from '@kbn/core/public';
import type { IImporter } from '@kbn/file-upload-plugin/public/importer/types';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { IngestPipeline } from '@kbn/file-upload-plugin/common/types';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AnalyzedFile } from './file_wrapper';
import { FileWrapper } from './file_wrapper';
import {
  createKibanaDataView,
  getInferenceId,
} from '../../application/file_data_visualizer/components/import_view/import';
import { AutoDeploy } from '../../application/file_data_visualizer/components/import_view/auto_deploy';
import type { FileUploadResults } from '../flyout/create_flyout';
import type { FileClash } from './merge_tools';
import {
  createMergedMappings,
  createMergedPipeline,
  getFormatClashes,
  getMappingClashInfo,
} from './merge_tools';

export enum STATUS {
  NA,
  NOT_STARTED,
  STARTED,
  COMPLETED,
  FAILED,
}

export interface UploadStatus {
  overallImportStatus: STATUS;
  indexCreated: STATUS;
  pipelineCreated: STATUS;
  modelDeployed: STATUS;
  dataViewCreated: STATUS;
  fileImport: STATUS;
  filesStatus: AnalyzedFile[];
  // mappingClashes: MappingClash[];
  fileClashes: FileClash[];
  formatMix: boolean;
}

export class FileManager {
  private readonly files$ = new BehaviorSubject<FileWrapper[]>([]);
  private readonly analysisValid$ = new BehaviorSubject<boolean>(false);
  public readonly analysisStatus$: Observable<AnalyzedFile[]> = this.files$.pipe(
    switchMap((files) => {
      return files.length === 0
        ? new Observable<AnalyzedFile[]>((subscriber) => subscriber.next([]))
        : combineLatest(files.map((file) => file.fileStatus$));
    })
  );
  public readonly analysisOk$ = new BehaviorSubject<boolean>(false); // can this be removed in favour of uploadStatus?
  private mappingsCheckSubscription: Subscription;
  private settings = {};
  private mappings: MappingTypeMapping | null = null;
  private pipeline: IngestPipeline | null = null;
  private inferenceId: string | null = null;
  private importer: IImporter | null = null;
  private timeFieldName: string | undefined | null = null;
  private commonFileFormat: string | null = null;

  public readonly uploadStatus$ = new BehaviorSubject<UploadStatus>({
    overallImportStatus: STATUS.NOT_STARTED,
    indexCreated: STATUS.NOT_STARTED,
    pipelineCreated: STATUS.NOT_STARTED,
    modelDeployed: STATUS.NA,
    dataViewCreated: STATUS.NA,
    fileImport: STATUS.NOT_STARTED,
    filesStatus: [],
    // mappingClashes: [],
    fileClashes: [],
    formatMix: false,
  });

  constructor(
    private fileUpload: FileUploadStartApi,
    private http: HttpSetup,
    private dataViewsContract: DataViewsServicePublic,
    private autoAddSemanticTextField: boolean = false
  ) {
    // eslint-disable-next-line no-console
    console.log('FileManager constructor');

    // this.files$.subscribe((files) => {
    //   console.log('files', files);
    // });

    // this.files = new Map<string, FileWrapper>();
    this.mappingsCheckSubscription = this.analysisStatus$.subscribe((statuses) => {
      // console.log('statuses', statuses);

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
          this.pipeline = this.createMergedPipeline();
          this.addSemanticTextField();
          this.setStatus({
            // mappingClashes: [],
            fileClashes: [],
          });
        } else {
          this.setStatus({
            // mappingClashes,
            fileClashes: getMappingClashInfo(mappingClashes, statuses),
          });
        }
        this.analysisOk$.next(mappingsOk && formatsOk);
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
    this.analysisOk$.next(false);
    const promises = Array.from(fileList).map((file) => this.addFile(file));
    await Promise.all(promises);

    // console.log(this.files.length);
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

  public getFiles() {
    return this.files$.getValue();
  }

  private getFormatClashes(): {
    formatsOk: boolean;
    fileClashes: FileClash[];
  } {
    // console.log('checkFormat');
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

  private createMergedPipeline() {
    const files = this.getFiles();
    return createMergedPipeline(files, this.commonFileFormat!);
  }

  public async import(
    indexName: string,
    createDataView: boolean = true
  ): Promise<FileUploadResults | null> {
    if (this.mappings === null || this.pipeline === null || this.commonFileFormat === null) {
      return null;
      // should throw an error here
    }

    this.setStatus({
      overallImportStatus: STATUS.STARTED,
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
      // wrap in try catch
      this.setStatus({
        modelDeployed: STATUS.COMPLETED,
      });
    }

    this.setStatus({
      indexCreated: STATUS.STARTED,
      pipelineCreated: STATUS.STARTED,
    });
    const initializeImportResp = await this.importer.initializeImport(
      indexName,
      this.settings,
      this.mappings,
      this.pipeline
    );
    this.timeFieldName = this.importer.getTimeField();
    const indexCreated = initializeImportResp.index !== undefined;
    const pipelineCreated = initializeImportResp.pipelineId !== undefined;
    this.setStatus({
      indexCreated: indexCreated ? STATUS.COMPLETED : STATUS.FAILED,
      pipelineCreated: pipelineCreated ? STATUS.COMPLETED : STATUS.FAILED,
    });

    if (!indexCreated || !pipelineCreated) {
      return null;
    }
    this.setStatus({
      fileImport: STATUS.STARTED,
    });
    // import data
    const files = this.getFiles();
    await Promise.all(
      files.map(async (file) => {
        await file.import(
          initializeImportResp.id,
          indexName,
          initializeImportResp.pipelineId!,
          this.mappings,
          this.pipeline
        );
        // check importResp.success
      })
    );
    this.setStatus({
      fileImport: STATUS.COMPLETED,
    });

    // for (const file of files) {
    //   const importResp = await file.import(
    //     initializeImportResp.id,
    //     indexName,
    //     initializeImportResp.pipelineId!,
    //     this.mappings,
    //     this.pipeline
    //   );
    //   // check importResp.success
    // }
    const dataView = '';
    let dataViewResp;
    if (createDataView) {
      this.setStatus({
        dataViewCreated: STATUS.STARTED,
      });
      const dataViewName = dataView === '' ? indexName : dataView;
      dataViewResp = await createKibanaDataView(
        dataViewName,
        this.dataViewsContract,
        this.timeFieldName
      );
      this.setStatus({
        dataViewCreated: STATUS.COMPLETED,
      });
    }

    this.setStatus({
      overallImportStatus: STATUS.COMPLETED,
    });

    // FileUploadResults
    return {
      index: indexName,
      dataView: dataViewResp ? { id: dataViewResp.id!, title: dataView! } : undefined,
      pipelineId: initializeImportResp.pipelineId,
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
    const autoDeploy = new AutoDeploy(this.http, this.inferenceId);
    // put inside try catch
    await autoDeploy.deploy();
  }

  private isTikaFormat() {
    return this.commonFileFormat === 'tika';
  }

  private addSemanticTextField() {
    if (
      this.isTikaFormat() &&
      this.autoAddSemanticTextField &&
      this.pipeline !== null &&
      this.mappings !== null
    ) {
      this.mappings.properties!.content = {
        type: 'semantic_text',
        inference_id: '.elser-2-elasticsearch',
      };

      this.pipeline.processors.push({
        set: {
          field: 'content',
          copy_from: 'attachment.content',
        },
      });
    }
  }
}
