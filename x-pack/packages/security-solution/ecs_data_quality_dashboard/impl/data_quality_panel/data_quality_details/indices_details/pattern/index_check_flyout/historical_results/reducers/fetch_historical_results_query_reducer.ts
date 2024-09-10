/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchHistoricalResultsQueryState } from '../../types';

type Action =
  | { type: 'SET_DATE'; payload: { startDate: string; endDate: string } }
  | { type: 'SET_OUTCOME'; payload: 'pass' | 'fail' | undefined }
  | { type: 'SET_FROM'; payload: number }
  | { type: 'SET_SIZE'; payload: number };

export const fetchHistoricalResultsQueryReducer = (
  state: FetchHistoricalResultsQueryState,
  action: Action
) => {
  if (action.type === 'SET_DATE') {
    return {
      ...state,
      startDate: action.payload.startDate,
      endDate: action.payload.endDate,
      from: 0,
    };
  }

  if (action.type === 'SET_OUTCOME') {
    if (action.payload === undefined) {
      // omit outcome from the query
      const { outcome, ...rest } = state;
      return {
        ...rest,
        from: 0,
      };
    }

    return {
      ...state,
      outcome: action.payload,
      from: 0,
    };
  }

  if (action.type === 'SET_FROM') {
    return {
      ...state,
      from: action.payload,
    };
  }

  if (action.type === 'SET_SIZE') {
    return {
      ...state,
      size: action.payload,
      from: 0,
    };
  }

  return state;
};
