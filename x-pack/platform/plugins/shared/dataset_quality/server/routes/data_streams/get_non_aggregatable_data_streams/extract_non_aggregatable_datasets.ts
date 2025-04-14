/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Indices } from '@elastic/elasticsearch/lib/api/types';
import { extractIndexNameFromBackingIndex } from '../../../../common/utils';

export const extractNonAggregatableDatasets = (
  indices: Indices,
  nonAggregatableIndices: Indices
) => {
  const groupedDatasets = (Array.isArray(indices) ? indices : [indices]).reduce((acc, index) => {
    const dataset = extractIndexNameFromBackingIndex(index);

    return {
      ...acc,
      [dataset]: [...(acc[dataset] ?? []), index],
    };
  }, {} as Record<string, string[]>);

  const groupedNonAggregatableIndices = (
    Array.isArray(nonAggregatableIndices) ? nonAggregatableIndices : [nonAggregatableIndices]
  ).reduce((acc, index) => {
    const dataset = extractIndexNameFromBackingIndex(index);

    return {
      ...acc,
      [dataset]: [...(acc[dataset] ?? []), index],
    };
  }, {} as Record<string, string[]>);

  return Object.entries(groupedNonAggregatableIndices)
    .filter(
      ([dataset, datasetIndices]) => groupedDatasets[dataset]?.length <= datasetIndices.length
    )
    .map(([dataset]) => dataset)
    .flat();
};
