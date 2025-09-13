/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maxMaintenanceWindowDocs } from '../constants/v1';

export const validatePagination = (params: { page?: number; per_page?: number }) => {
  const pageAsNumber = params.page ?? 0;
  const perPageAsNumber = params.per_page ?? 0;

  if (Math.max(pageAsNumber, pageAsNumber * perPageAsNumber) > maxMaintenanceWindowDocs) {
    return `The number of documents is too high. Paginating through more than ${maxMaintenanceWindowDocs} documents is not possible.`;
  }
};
