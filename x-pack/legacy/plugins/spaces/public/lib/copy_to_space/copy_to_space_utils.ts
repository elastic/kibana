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
}
interface UnsuccessfulResponse {
  successful: false;
  hasConflicts: boolean;
  hasUnresolvableErrors: boolean;
  objects: SummarizedSavedObjectResult[];
}

export type SummarizedCopyToSpaceResponse = SuccessfulResponse | UnsuccessfulResponse;

export function summarizeCopyResult(savedObject: SavedObjectRecord, copyResult: undefined): null;
export function summarizeCopyResult(
  savedObject: SavedObjectRecord,
  copyResult: ProcessedImportResponse
): SummarizedCopyToSpaceResponse;

export function summarizeCopyResult(
  savedObject: SavedObjectRecord,
  copyResult: ProcessedImportResponse | undefined
): SummarizedCopyToSpaceResponse | null {
  if (typeof copyResult === 'undefined') {
    return null;
  }

  const successful = copyResult && copyResult.failedImports.length === 0;
  const conflicts = copyResult.failedImports.filter(failed => failed.error.type === 'conflict');
  const unresolvableErrors = copyResult.failedImports.filter(
    failed => failed.error.type !== 'conflict'
  );
  const hasConflicts = conflicts.length > 0;
  const hasUnresolvableErrors =
    copyResult && copyResult.failedImports.some(failed => failed.error.type !== 'conflict');

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

  if (successful) {
    return {
      successful,
      hasConflicts: false,
      objects,
      hasUnresolvableErrors: false,
    };
  }

  return {
    successful,
    hasConflicts,
    objects,
    hasUnresolvableErrors,
  };
}
