/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { BulkOptions, BulkOptionsFilter, BulkOptionsIds } from '../types';

export const getAndValidateCommonBulkOptions = (options: BulkOptions) => {
  const filter = (options as BulkOptionsFilter).filter;
  const ids = (options as BulkOptionsIds).ids;

  if (!ids && !filter) {
    throw Boom.badRequest(
      "Either 'ids' or 'filter' property in method's arguments should be provided"
    );
  }

  if (ids?.length === 0) {
    throw Boom.badRequest("'ids' property should not be an empty array");
  }

  if (ids && filter) {
    throw Boom.badRequest(
      "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method's arguments"
    );
  }
  return { ids, filter };
};
