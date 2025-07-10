/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { TaskErrorSource, createTaskRunError } from '@kbn/task-manager-plugin/server';

/**
 * Decides whether the thrown error is caused by a user-side misconfiguration
 * (missing saved object, unknown ML job/group, malformed job definition).
 *
 * Anything that doesn’t match these predicates will be treated as a framework
 * error and counted toward alert-execution SLOs.
 */
const isUserMisconfigurationError = (err: unknown): boolean => {
  if (SavedObjectsErrorHelpers.isNotFoundError(err as Error)) {
    return true;
  }

  if (
    err !== null &&
    typeof err === 'object' &&
    Object.hasOwn(err, 'statusCode') &&
    (err as { statusCode: unknown }).statusCode === 404
  ) {
    return true;
  }

  if (isBoom(err) && (err.output.statusCode === 404 || err.output.statusCode === 400)) {
    return true;
  }

  return false;
};

export const assertUserError = (err: unknown) => {
  if (isUserMisconfigurationError(err)) {
    throw createTaskRunError(err as Error, TaskErrorSource.USER);
  }
  throw err;
};
