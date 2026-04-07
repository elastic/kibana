/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import type { Index } from '../../../../common';
import {
  deleteIndicesSuccess,
  loadIndicesSuccess,
  reloadIndicesSuccess,
  loadIndicesStart,
  loadIndicesError,
  loadIndicesEnrichmentError,
} from '../actions';
import type { HttpError } from '../types';

type IndicesByIdPayload = { indexNames: string[] } | { indices: Index[] };

type IndicesAllIdsPayload = IndicesByIdPayload;

const byId = handleActions<Record<string, Index>, IndicesByIdPayload>(
  {
    [String(deleteIndicesSuccess)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }

      const { indexNames } = action.payload;

      const newState: Record<string, Index> = {};
      Object.values(state).forEach((index: Index) => {
        if (!indexNames.includes(index.name)) {
          newState[index.name] = index;
        }
      });

      return newState;
    },
    [String(loadIndicesSuccess)](state, action) {
      if (!('indices' in action.payload)) {
        return state;
      }

      const { indices } = action.payload;
      const newState: Record<string, Index> = {};
      indices.forEach((index: Index) => {
        newState[index.name] = index;
      });

      return newState;
    },
    [String(reloadIndicesSuccess)](state, action) {
      if (!('indices' in action.payload)) {
        return state;
      }

      const { indices } = action.payload;

      const newState: Record<string, Index> = {};
      indices.forEach((index: Index) => {
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

const allIds = handleActions<string[], IndicesAllIdsPayload>(
  {
    [String(deleteIndicesSuccess)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }

      const { indexNames } = action.payload;
      const newState: string[] = [];
      state.forEach((indexName: string) => {
        if (!indexNames.includes(indexName)) {
          newState.push(indexName);
        }
      });
      return newState;
    },
    [String(loadIndicesSuccess)](state, action) {
      if (!('indices' in action.payload)) {
        return state;
      }

      const { indices } = action.payload;
      return indices.map((index: Index) => index.name);
    },
    [String(reloadIndicesSuccess)](state) {
      // the set of IDs should never change when refreshing indexes.
      return state;
    },
  },
  []
);

const loading = handleActions(
  {
    [String(loadIndicesStart)]() {
      return true;
    },
    [String(loadIndicesSuccess)]() {
      return false;
    },
    [String(loadIndicesError)]() {
      return false;
    },
  },
  true
);

const error = handleActions<false | HttpError, HttpError>(
  {
    [String(loadIndicesError)](_state, action) {
      return action.payload;
    },
    [String(loadIndicesStart)]() {
      return false;
    },
    [String(loadIndicesSuccess)]() {
      return false;
    },
  },
  false
);

const enrichmentErrors = handleActions<string[], { source: string }>(
  {
    [String(loadIndicesStart)]() {
      return [];
    },
    [String(loadIndicesEnrichmentError)](state, action) {
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
