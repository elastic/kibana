/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';

export interface FileUploadResults {
  index: string;
  pipelineId?: string;
  dataView?: { id: string; title: string };
  inferenceId?: string;
  files: Array<{ fileName: string; docCount: number; fileFormat: string; documentType: string }>;
}

export interface OpenFileUploadLiteContext {
  onUploadComplete?: (results: FileUploadResults | null) => void;
  indexSettings?: IndicesIndexSettings;
  autoAddInference?: string;
  autoCreateDataView?: boolean;
}
