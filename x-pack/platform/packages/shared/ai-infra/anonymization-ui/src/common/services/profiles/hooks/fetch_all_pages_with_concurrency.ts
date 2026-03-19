/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface FetchPageResponse<T> {
  data: T[];
  total: number;
}

interface FetchAllPagesWithConcurrencyParams<T> {
  perPage: number;
  maxConcurrency: number;
  fetchPage: (page: number, perPage: number) => Promise<FetchPageResponse<T>>;
}

const clampConcurrency = (value: number): number => Math.max(1, Math.floor(value));

export const fetchAllPagesWithConcurrency = async <T>({
  perPage,
  maxConcurrency,
  fetchPage,
}: FetchAllPagesWithConcurrencyParams<T>): Promise<T[]> => {
  if (!Number.isFinite(perPage) || perPage <= 0) {
    throw new Error('perPage must be a positive finite number');
  }

  const normalizedConcurrency = Number.isFinite(maxConcurrency) ? maxConcurrency : 1;
  const firstPageResponse = await fetchPage(1, perPage);
  const totalPages = Math.max(1, Math.ceil(firstPageResponse.total / perPage));
  if (totalPages === 1) {
    return firstPageResponse.data;
  }

  const pageResults: T[][] = new Array(totalPages + 1);
  pageResults[1] = firstPageResponse.data;

  let nextPage = 2;
  const workerCount = Math.min(clampConcurrency(normalizedConcurrency), totalPages - 1);

  const worker = async () => {
    while (nextPage <= totalPages) {
      const pageToFetch = nextPage;
      nextPage += 1;
      const pageResponse = await fetchPage(pageToFetch, perPage);
      pageResults[pageToFetch] = pageResponse.data;
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return pageResults.slice(1).flatMap((pageData) => pageData ?? []);
};
