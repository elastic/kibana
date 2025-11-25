/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  IngestPipelineWrapper,
  InitializeImportResponse,
  ImportDoc,
  ImportResponse,
} from '@kbn/file-upload-common';
import { getHttp } from '../kibana_services';

interface CallInitializeImportRoute {
  index: string;
  settings: IndicesIndexSettings;
  mappings: MappingTypeMapping;
  ingestPipelines?: IngestPipelineWrapper[];
  existingIndex?: boolean;
  signal?: AbortSignal;
}

interface CallImportRoute {
  index: string;
  ingestPipelineId: string;
  data: ImportDoc[];
  signal?: AbortSignal;
}

export function callInitializeImportRoute({
  index,
  settings,
  mappings,
  ingestPipelines,
  existingIndex,
  signal,
}: CallInitializeImportRoute) {
  const body = JSON.stringify({
    index,
    settings,
    mappings,
    ingestPipelines,
    existingIndex,
  });

  return getHttp().fetch<InitializeImportResponse>({
    path: `/internal/file_upload/initialize_import`,
    method: 'POST',
    version: '1',
    body,
    signal,
  });
}

export function callImportRoute({ index, data, ingestPipelineId, signal }: CallImportRoute) {
  const body = JSON.stringify({
    index,
    ingestPipelineId,
    data,
  });

  return getHttp().fetch<ImportResponse>({
    path: `/internal/file_upload/import`,
    method: 'POST',
    version: '2',
    body,
    signal,
  });
}
