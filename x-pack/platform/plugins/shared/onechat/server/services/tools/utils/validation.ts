/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError, idRegexp, isReservedToolId } from '@kbn/onechat-common';

/**
 * Check if an ID is valid for creation
 * @param id
 */
export const ensureValidId = (id: string) => {
  // TODO: check where this is being used
  if (isReservedToolId(id)) {
    throw createBadRequestError(`Tool id ${id} is reserved`);
  }
  if (!idRegexp.test(id)) {
    throw createBadRequestError(
      `Invalid tool id: ${id}: Tool ids must start and end with a letter or number, and can only contain lowercase letters, numbers, and underscores`
    );
  }
};
