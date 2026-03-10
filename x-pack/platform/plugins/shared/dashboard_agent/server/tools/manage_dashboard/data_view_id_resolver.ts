/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewListItem, DataViewsService } from '@kbn/data-views-plugin/common';

export interface ResolveControlDataViewIdInput {
  indexPattern: string;
}

const toCandidateList = (matches: DataViewListItem[]): string => {
  const sortedMatches = [...matches].sort(
    (left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
  );

  return sortedMatches.map(({ id, title }) => `"${title}" (${id})`).join(', ');
};

export const resolveControlDataViewId = async ({
  dataViewsService,
  input,
}: {
  dataViewsService: DataViewsService;
  input: ResolveControlDataViewIdInput;
}): Promise<string> => {
  const lookupInput = input.indexPattern;
  const dataViews = await dataViewsService.getIdsWithTitle();

  const exactMatches = dataViews.filter(({ title }) => title === lookupInput);
  if (exactMatches.length === 1) {
    return exactMatches[0].id;
  }

  if (exactMatches.length > 1) {
    throw new Error(
      `Data view match for "${lookupInput}" is ambiguous. Candidates: ${toCandidateList(
        exactMatches
      )}.`
    );
  }

  const lowerLookupInput = lookupInput.toLowerCase();
  const caseInsensitiveMatches = dataViews.filter(
    ({ title }) => title.toLowerCase() === lowerLookupInput
  );
  if (caseInsensitiveMatches.length === 1) {
    return caseInsensitiveMatches[0].id;
  }

  if (caseInsensitiveMatches.length > 1) {
    throw new Error(
      `Data view match for "${lookupInput}" is ambiguous. Candidates: ${toCandidateList(
        caseInsensitiveMatches
      )}.`
    );
  }

  throw new Error(`No data view matched "${lookupInput}".`);
};
