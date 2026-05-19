/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export function isFieldAggregatable(
  fieldCapsResponse: Awaited<ReturnType<ElasticsearchClient['fieldCaps']>>,
  fieldName: string
): boolean {
  const fieldCaps = fieldCapsResponse.fields[fieldName];
  if (!fieldCaps) {
    return false;
  }

  return Object.values(fieldCaps).every((caps) => caps.aggregatable === true);
}
