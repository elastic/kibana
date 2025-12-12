/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaginationInputPaginated, Inspect } from '../../search_strategy';
import { MAX_OFFSET_RESULTS } from '../../constants';

export const calculateMaxOffsetPage = (pageSize: number): number =>
  Math.floor(MAX_OFFSET_RESULTS / pageSize) - 1;

export const isWithinOffsetLimit = (page: number, pageSize: number): boolean =>
  (page + 1) * pageSize <= MAX_OFFSET_RESULTS;

export type InspectResponse = Inspect & { response: string[] };

export const generateTablePaginationOptions = (
  activePage: number,
  limit: number
): PaginationInputPaginated => {
  const cursorStart = activePage * limit;

  return {
    activePage,
    cursorStart,
    querySize: limit,
  };
};
