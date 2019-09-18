/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Payload } from 'boom';
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

export interface CopyResponse {
  [spaceId: string]: {
    success: boolean;
    successCount: number;
    errors?: Array<SavedObjectsImportError | Payload>;
  };
}
