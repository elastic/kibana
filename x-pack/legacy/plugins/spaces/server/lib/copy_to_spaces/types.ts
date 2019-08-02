/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsImportError } from 'src/core/server';

export interface CopyOptions {
  objects: Array<{ type: string; id: string }>;
  overwrite: boolean;
  includeReferences: boolean;
}

export interface ResolveConflictsOptions {
  objects: Array<{ type: string; id: string }>;
  includeReferences: boolean;
  retries: {
    [spaceId: string]: Array<{ type: string; id: string; overwrite: boolean }>;
  };
}

export interface SpaceNotFoundError {
  type: 'space_not_found';
  spaceId: string;
}

export interface UnauthorizedToManageSavedObjectsError {
  type: 'unauthorized_to_manage_saved_objects';
  spaceId: string;
}

export interface CopyToSpaceError {
  error: SpaceNotFoundError | UnauthorizedToManageSavedObjectsError;
}

export interface CopyResponse {
  [spaceId: string]: {
    success: boolean;
    successCount: number;
    errors?: Array<SavedObjectsImportError | CopyToSpaceError>;
  };
}
