/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom, { Payload } from 'boom';
import { SavedObjectsImportError } from 'src/core/server';

export const createEmptyFailureResponse = (errors?: Array<SavedObjectsImportError | Boom>) => {
  const errorMessages: Array<SavedObjectsImportError | Payload> = (errors || []).map(error => {
    if (Boom.isBoom(error as any)) {
      return (error as Boom).output.payload as Payload;
    }
    return error as SavedObjectsImportError;
  });

  return {
    success: false,
    successCount: 0,
    errors: errorMessages,
  };
};
