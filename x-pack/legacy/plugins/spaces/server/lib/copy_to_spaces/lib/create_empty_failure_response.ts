/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom, { Payload } from 'boom';
import { SavedObjectsImportError } from 'src/core/server';
import { CopyToSpaceError } from '../types';

export const createEmptyFailureResponse = (
  errors?: Array<SavedObjectsImportError | CopyToSpaceError | Boom>
) => {
  const errorMessages: Array<SavedObjectsImportError | CopyToSpaceError | Payload> = (
    errors || []
  ).map(error => {
    if (Boom.isBoom(error as any)) {
      return (error as Boom).output.payload as Payload;
    }
    return error as SavedObjectsImportError | CopyToSpaceError;
  });

  return {
    success: false,
    successCount: 0,
    errors: errorMessages,
  };
};
