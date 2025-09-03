/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createBadRequestError,
  toolIdRegexp,
  isReservedToolId,
  isInProtectedNamespace,
} from '@kbn/onechat-common';

/**
 * Check if an ID is valid for creation
 * @param id
 */
export const ensureValidId = (id: string) => {
  if (isReservedToolId(id)) {
    throw createBadRequestError(`Tool id ${id} is reserved`);
  }
  if (isInProtectedNamespace(id)) {
    throw createBadRequestError(`Tool id ${id} is using a protected namespace`);
  }
  if (!toolIdRegexp.test(id)) {
    throw createBadRequestError(
      `Invalid tool id: ${id}: Tool ids must start and end with a letter or number, and can only contain lowercase letters, numbers, dots and underscores`
    );
  }
};
