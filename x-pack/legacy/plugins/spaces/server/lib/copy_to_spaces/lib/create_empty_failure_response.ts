/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsImportError } from 'src/core/server';
import { CopyToSpaceError } from '../types';

export const createEmptyFailureResponse = (
  errors?: Array<SavedObjectsImportError | CopyToSpaceError>
) => ({
  success: false,
  successCount: 0,
  errors,
});
