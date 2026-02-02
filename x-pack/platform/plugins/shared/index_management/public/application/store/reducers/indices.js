/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import {
  deleteIndicesSuccess,
  loadIndicesSuccess,
  reloadIndicesSuccess,
  loadIndicesStart,
  loadIndicesError,
  loadIndicesEnrichmentError,
} from '../actions';

const byId = handleActions(
  {
    [deleteIndicesSuccess](state, action) {
      const { indexNames } = action.payload;

      const newState = {};
      Object.values(state).forEach((index) => {
        if (!indexNames.includes(index.name)) {
          newState[index.name] = index;
        }
      });

      return newState;
    },
    [loadIndicesSuccess](state, action) {
      const { indices } = action.payload;
      const newState = {};
      indices.forEach((index) => {
        newState[index.name] = index;
      });

      return newState;
    },
    [reloadIndicesSuccess](state, action) {
      const { indices } = action.payload;

      const newState = {};
      indices.forEach((index) => {
        newState[index.name] = index;
      });

      return {
        ...state,
        ...newState,
      };
    },
  },
  {}
);

const allIds = handleActions(
  {
    [deleteIndicesSuccess](state, action) {
      const { indexNames } = action.payload;
      const newState = [];
      state.forEach((indexName) => {
        if (!indexNames.includes(indexName)) {
          newState.push(indexName);
        }
      });
      return newState;
    },
    [loadIndicesSuccess](state, action) {
      const { indices } = action.payload;
      return indices.map((index) => index.name);
    },
    [reloadIndicesSuccess](state) {
      // the set of IDs should never change when refreshing indexes.
      return state;
    },
  },
  []
);

const loading = handleActions(
  {
    [loadIndicesStart]() {
      return true;
    },
    [loadIndicesSuccess]() {
      return false;
    },
    [loadIndicesError]() {
      return false;
    },
  },
  true
);

const error = handleActions(
  {
    [loadIndicesError](state, action) {
      const error = action.payload;
      const newState = { ...error };
      return newState;
    },
    [loadIndicesStart]() {
      return false;
    },
    [loadIndicesSuccess]() {
      return false;
    },
  },
  false
);

const enrichmentErrors = handleActions(
  {
    [loadIndicesStart]() {
      return [];
    },
    [loadIndicesEnrichmentError](state, action) {
      const { source } = action.payload;
      if (!source) return state;
      if (state.includes(source)) return state;
      return [...state, source];
    },
  },
  []
);

export const indices = combineReducers({
  loading,
  error,
  enrichmentErrors,
  byId,
  allIds,
});
