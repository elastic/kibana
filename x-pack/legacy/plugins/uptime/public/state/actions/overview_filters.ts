/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewFilters } from '../../../common/runtime_types';

export const FETCH_OVERVIEW_FILTERS = 'FETCH_OVERVIEW_FILTERS';
export const FETCH_OVERVIEW_FILTERS_FAIL = 'FETCH_OVERVIEW_FILTERS_FAIL';
export const FETCH_OVERVIEW_FILTERS_SUCCESS = 'FETCH_OVERVIEW_FILTERS_SUCCESS';

export interface GetOverviewFiltersPayload {
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

interface GetOverviewFiltersFetchAction {
  type: typeof FETCH_OVERVIEW_FILTERS;
  payload: GetOverviewFiltersPayload;
}

interface GetOverviewFiltersSuccessAction {
  type: typeof FETCH_OVERVIEW_FILTERS_SUCCESS;
  payload: OverviewFilters;
}

interface GetOverviewFiltersFailAction {
  type: typeof FETCH_OVERVIEW_FILTERS_FAIL;
  payload: Error;
}

export type OverviewFiltersAction =
  | GetOverviewFiltersFetchAction
  | GetOverviewFiltersSuccessAction
  | GetOverviewFiltersFailAction;

export const fetchOverviewFilters = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: string,
  statusFilter?: string
): GetOverviewFiltersFetchAction => ({
  type: FETCH_OVERVIEW_FILTERS,
  payload: {
    dateRangeStart,
    dateRangeEnd,
    filters,
    statusFilter,
  },
});

export const fetchOverviewFiltersFail = (error: Error): GetOverviewFiltersFailAction => ({
  type: FETCH_OVERVIEW_FILTERS_FAIL,
  payload: error,
});

export const fetchOverviewFiltersSuccess = (
  filters: OverviewFilters
): GetOverviewFiltersSuccessAction => ({
  type: FETCH_OVERVIEW_FILTERS_SUCCESS,
  payload: filters,
});
