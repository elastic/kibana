/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessedImportResponse, SavedObjectRecord } from 'ui/management/saved_objects_management';

export interface SummarizedSavedObjectResult {
  type: string;
  id: string;
  name: string;
  conflicts: ProcessedImportResponse['failedImports'];
  hasUnresolvableErrors: boolean;
}

interface SuccessfulResponse {
  successful: true;
  hasConflicts: false;
  hasUnresolvableErrors: false;
  objects: SummarizedSavedObjectResult[];
  processing: false;
}
interface UnsuccessfulResponse {
  successful: false;
  hasConflicts: boolean;
  hasUnresolvableErrors: boolean;
  objects: SummarizedSavedObjectResult[];
  processing: false;
}

interface ProcessingResponse {
  objects: SummarizedSavedObjectResult[];
  processing: true;
}

export type SummarizedCopyToSpaceResponse =
  | SuccessfulResponse
  | UnsuccessfulResponse
  | ProcessingResponse;

export function summarizeCopyResult(
  savedObject: SavedObjectRecord,
  copyResult: undefined,
  includeRelated: boolean
): null;
export function summarizeCopyResult(
  savedObject: SavedObjectRecord,
  copyResult: ProcessedImportResponse | undefined,
  includeRelated: boolean
): SummarizedCopyToSpaceResponse;

export function summarizeCopyResult(
  savedObject: SavedObjectRecord,
  copyResult: ProcessedImportResponse | undefined,
  includeRelated: boolean
): SummarizedCopyToSpaceResponse | null {
  const successful = Boolean(copyResult && copyResult.failedImports.length === 0);

  const conflicts = copyResult
    ? copyResult.failedImports.filter(failed => failed.error.type === 'conflict')
    : [];

  const unresolvableErrors = copyResult
    ? copyResult.failedImports.filter(failed => failed.error.type !== 'conflict')
    : [];

  const hasConflicts = conflicts.length > 0;

  const hasUnresolvableErrors = Boolean(
    copyResult && copyResult.failedImports.some(failed => failed.error.type !== 'conflict')
  );

  const objects: SummarizedSavedObjectResult[] = [
    {
      type: savedObject.type,
      id: savedObject.id,
      name: savedObject.meta.title,
      conflicts: conflicts.filter(
        c => c.obj.type === savedObject.type && c.obj.id === savedObject.id
      ),
      hasUnresolvableErrors: unresolvableErrors.some(
        e => e.obj.type === savedObject.type && e.obj.id === savedObject.id
      ),
    },
  ];

  if (includeRelated) {
    savedObject.references.forEach(ref => {
      objects.push({
        type: ref.type,
        id: ref.id,
        name: ref.name,
        conflicts: conflicts.filter(c => c.obj.type === ref.type && c.obj.id === ref.id),
        hasUnresolvableErrors: unresolvableErrors.some(
          e => e.obj.type === ref.type && e.obj.id === ref.id
        ),
      });
    });
  }

  if (typeof copyResult === 'undefined') {
    return {
      processing: true,
      objects,
    };
  }

  if (successful) {
    return {
      successful,
      hasConflicts: false,
      objects,
      hasUnresolvableErrors: false,
      processing: false,
    };
  }

  return {
    successful,
    hasConflicts,
    objects,
    hasUnresolvableErrors,
    processing: false,
  };
}
