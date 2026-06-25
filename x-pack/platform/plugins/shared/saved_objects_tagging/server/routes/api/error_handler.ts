/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { TagValidationError } from '../../services/tags';

export function handleRouteError(
  error: Error,
  res: KibanaResponseFactory,
  { notFoundMessage }: { notFoundMessage?: string } = {}
) {
  if (error instanceof TagValidationError) {
    return res.badRequest({
      body: {
        message: error.message,
        attributes: error.validation,
      },
    });
  }

  if (SavedObjectsErrorHelpers.isForbiddenError(error)) {
    return res.forbidden({ body: { message: error.message } });
  }

  if (SavedObjectsErrorHelpers.isConflictError(error)) {
    return res.conflict({ body: { message: error.message } });
  }

  if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
    return res.notFound({
      body: {
        message: notFoundMessage ?? error.message,
      },
    });
  }

  return res.customError({
    body: {
      message: error.message,
    },
    statusCode: 500,
  });
}
