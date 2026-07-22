/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isOsqueryActionsMetadataIndex = (index: string): boolean =>
  index.includes('osquery_manager.actions') && !index.includes('action.responses');

export const isOsqueryDataIndex = (index: string): boolean =>
  index.includes('osquery_manager') &&
  !index.includes('fleet') &&
  !isOsqueryActionsMetadataIndex(index);

export const shouldUseInternalSearchClient = (
  indices: string[],
  cpsEnabled: boolean
): boolean => {
  if (!cpsEnabled) {
    return indices.some((index) => index.includes('fleet') || index.includes('osquery_manager'));
  }

  return (
    indices.some((index) => index.includes('fleet')) ||
    indices.some(isOsqueryActionsMetadataIndex) ||
    !indices.some(isOsqueryDataIndex)
  );
};
