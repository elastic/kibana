/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError, isReservedToolId } from '@kbn/onechat-common';

const idRegexp = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
const builtinToolIdRegexp = /^[.][a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

/**
 * Check if an ID is valid for creation
 * @param id
 */
export const ensureValidId = (id: string) => {
  if (isReservedToolId(id)) {
    throw createBadRequestError(`Tool id ${id} is reserved`);
  }
  if (!idRegexp.test(id)) {
    throw createBadRequestError(
      `Invalid tool id: ${id}: Tool ids must start and end with a letter or number, and can only contain lowercase letters, numbers, and underscores`
    );
  }
};

/**
 * Checks if the provided ID is a valid built-in tool id
 * @param id
 */
export const isBuiltinToolId = (id: string) => builtinToolIdRegexp.test(id);
