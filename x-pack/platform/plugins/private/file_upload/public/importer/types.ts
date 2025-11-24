/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesIndexSettings,
  IngestDeletePipelineResponse,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

import type {
  IngestPipeline,
  InitializeImportResponse,
  ImportResults,
} from '@kbn/file-upload-common';

export interface IImporter {
  read(data: ArrayBuffer): { success: boolean };
  initializeImport(
    index: string,
    settings: IndicesIndexSettings,
    mappings: MappingTypeMapping,
    pipeline: Array<IngestPipeline | undefined>,
    existingIndex?: boolean,
    signal?: AbortSignal
  ): Promise<InitializeImportResponse>;
  initializeWithoutCreate(
    index: string,
    mappings: MappingTypeMapping,
    pipelines: IngestPipeline[],
    signal?: AbortSignal
  ): void;
  import(
    index: string,
    ingestPipelineId: string | undefined,
    setImportProgress: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<ImportResults>;
  initialized(): boolean;
  getIndex(): string | undefined;
  getTimeField(): string | undefined;
  previewIndexTimeRange(): Promise<{ start: number | null; end: number | null }>;
  deletePipelines(signal?: AbortSignal): Promise<IngestDeletePipelineResponse[]>;
}
