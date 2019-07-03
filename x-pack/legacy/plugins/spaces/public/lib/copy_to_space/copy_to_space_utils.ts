/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessedImportResponse } from 'ui/management/saved_objects_management';

interface SuccessfulResponse {
  successful: true;
  hasConflicts: false;
  conflicts: ProcessedImportResponse['failedImports'];
  hasUnresolvableErrors: false;
}
interface UnsuccessfulResponse {
  successful: false;
  hasConflicts: boolean;
  conflicts: ProcessedImportResponse['failedImports'];
  hasUnresolvableErrors: boolean;
}

type SummarizedResponse = SuccessfulResponse | UnsuccessfulResponse;

export function summarizeCopyResult(copyResult: undefined): null;
export function summarizeCopyResult(copyResult: ProcessedImportResponse): SummarizedResponse;
export function summarizeCopyResult(
  copyResult: ProcessedImportResponse | undefined
): SummarizedResponse | null {
  if (typeof copyResult === 'undefined') {
    return null;
  }

  const successful = copyResult && copyResult.failedImports.length === 0;

  if (successful) {
    return {
      successful,
      hasConflicts: false,
      conflicts: [],
      hasUnresolvableErrors: false,
    };
  }

  const conflicts = copyResult.failedImports.filter(failed => failed.error.type === 'conflict');
  const hasConflicts = conflicts.length > 0;
  const hasUnresolvableErrors =
    copyResult && copyResult.failedImports.some(failed => failed.error.type !== 'conflict');

  return {
    successful,
    hasConflicts,
    conflicts,
    hasUnresolvableErrors,
  };
}
