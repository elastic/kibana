/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { FailedImport, ProcessedImportResponse } from './process_import_response';
export { processImportResponse } from './process_import_response';

export type {
  SummarizedCopyToSpaceResult,
  SummarizedSavedObjectResult,
} from './summarize_copy_result';
export { summarizeCopyResult } from './summarize_copy_result';
