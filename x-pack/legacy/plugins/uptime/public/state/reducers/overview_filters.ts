/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewFilters } from '../../../common/runtime_types';
import {
  FETCH_OVERVIEW_FILTERS,
  FETCH_OVERVIEW_FILTERS_FAIL,
  FETCH_OVERVIEW_FILTERS_SUCCESS,
  OverviewFiltersAction,
} from '../actions';

export interface OverviewFiltersState {
  filters: OverviewFilters;
  errors: Error[];
  loading: boolean;
}

const initialState: OverviewFiltersState = {
  filters: {
    locations: [],
    ports: [],
    schemes: [],
    tags: [],
  },
  errors: [],
  loading: false,
};

export function overviewFiltersReducer(
  state = initialState,
  action: OverviewFiltersAction
): OverviewFiltersState {
  switch (action.type) {
    case FETCH_OVERVIEW_FILTERS:
      return {
        ...state,
        loading: true,
      };
    case FETCH_OVERVIEW_FILTERS_SUCCESS:
      return {
        ...state,
        filters: action.payload,
        loading: false,
      };
    case FETCH_OVERVIEW_FILTERS_FAIL:
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    default:
      return state;
  }
}
