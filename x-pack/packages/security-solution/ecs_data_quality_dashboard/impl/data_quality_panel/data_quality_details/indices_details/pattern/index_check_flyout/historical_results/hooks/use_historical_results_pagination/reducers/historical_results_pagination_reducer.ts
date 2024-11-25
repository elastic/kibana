/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PaginationReducerAction, PaginationReducerState } from '../../../types';

export const historicalResultsPaginationReducer = (
  state: PaginationReducerState,
  action: PaginationReducerAction
) => {
  if (action.type === 'SET_ROW_SIZE') {
    return {
      rowSize: action.payload.rowSize,
      // reason for Math.ceil is to ensure that we have a page for the remaining results
      // e.g. if we have 11 results and rowSize is 5, 11/5 = 2.2, if we use Math.floor we will have 2 pages
      // and will miss the last result, so we use Math.ceil to have 3 pages to include the last result
      pageCount: Math.ceil(action.payload.totalResults / action.payload.rowSize),
      // reset activePage to 0 when rowSize changes
      // because our activePage can be greater than the new pageCount
      activePage: 0,
    };
  }

  if (action.type === 'SET_ACTIVE_PAGE') {
    return {
      ...state,
      activePage: action.payload,
    };
  }

  return state;
};
