/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Payload } from '@hapi/boom';
import Boom from '@hapi/boom';

import type { SavedObjectsImportError } from '@kbn/core/server';

export const createEmptyFailureResponse = (errors?: Array<SavedObjectsImportError | Boom.Boom>) => {
  const errorMessages: Array<SavedObjectsImportError | Payload> = (errors || []).map((error) => {
    if (Boom.isBoom(error as any)) {
      return (error as Boom.Boom).output.payload as Payload;
    }
    return error as SavedObjectsImportError;
  });
  return {
    success: false,
    successCount: 0,
    errors: errorMessages,
  };
};
