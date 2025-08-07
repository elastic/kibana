/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricField } from '../types';

export function applyPagination({
  metricFields,
  page,
  size,
}: {
  metricFields: MetricField[];
  page: number;
  size: number;
}) {
  // For the first page, we need to start at Zero, for the remaining pages
  // offset by 1 then multiply by size
  const start = page === 1 ? page - 1 : (page - 1) * size;
  const end = page * size;
  return metricFields.slice(start, end);
}
