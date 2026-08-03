/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';
import type { Index } from '../../../../common';
import type { RowStatusState } from '../types';
import {
  clearCacheIndicesStart,
  clearRowStatus,
  closeIndicesStart,
  openIndicesStart,
  flushIndicesStart,
  forcemergeIndicesStart,
  reloadIndicesSuccess,
  refreshIndicesStart,
} from '../actions';
import {
  INDEX_CLEARING_CACHE,
  INDEX_CLOSED,
  INDEX_CLOSING,
  INDEX_FLUSHING,
  INDEX_FORCEMERGING,
  INDEX_OPEN,
  INDEX_OPENING,
  INDEX_REFRESHING,
} from '../../../../common/constants';

type RowStatusPayload = { indexNames: string[] } | { indices: Index[] };

export const rowStatus = handleActions<RowStatusState, RowStatusPayload>(
  {
    [String(clearRowStatus)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }
      const { indexNames } = action.payload;
      const newState = { ...state };
      indexNames.forEach((indexName) => {
        delete newState[indexName];
      });
      return newState;
    },
    [String(closeIndicesStart)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }
      const { indexNames } = action.payload;

      const statuses: RowStatusState = {};
      indexNames.forEach((indexName) => {
        statuses[indexName] = INDEX_CLOSING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [String(openIndicesStart)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }
      const { indexNames } = action.payload;

      const statuses: RowStatusState = {};
      indexNames.forEach((indexName) => {
        statuses[indexName] = INDEX_OPENING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [String(refreshIndicesStart)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }
      const { indexNames } = action.payload;

      const statuses: RowStatusState = {};
      indexNames.forEach((indexName) => {
        statuses[indexName] = INDEX_REFRESHING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [String(flushIndicesStart)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }
      const { indexNames } = action.payload;

      const statuses: RowStatusState = {};
      indexNames.forEach((indexName) => {
        statuses[indexName] = INDEX_FLUSHING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [String(forcemergeIndicesStart)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }
      const { indexNames } = action.payload;

      const statuses: RowStatusState = {};
      indexNames.forEach((indexName) => {
        statuses[indexName] = INDEX_FORCEMERGING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [String(clearCacheIndicesStart)](state, action) {
      if (!('indexNames' in action.payload)) {
        return state;
      }
      const { indexNames } = action.payload;

      const statuses: RowStatusState = {};
      indexNames.forEach((indexName) => {
        statuses[indexName] = INDEX_CLEARING_CACHE;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [String(reloadIndicesSuccess)](state, action) {
      if (!('indices' in action.payload)) {
        return state;
      }
      const { indices } = action.payload;
      const indicesByName = indices.reduce<Record<string, Index>>((acc, index) => {
        acc[index.name] = index;
        return acc;
      }, {});

      const newState = { ...state };
      // eslint-disable-next-line guard-for-in
      for (const indexName in state) {
        const index = indicesByName[indexName];
        if (!index) {
          delete newState[indexName];
          continue;
        }
        if (state[indexName] === INDEX_CLOSING && index.status === INDEX_CLOSED) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_OPENING && index.status === INDEX_OPEN) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_REFRESHING && index.status === INDEX_OPEN) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_REFRESHING && index.status === INDEX_CLOSED) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_FLUSHING && index.status === INDEX_OPEN) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_FLUSHING && index.status === INDEX_CLOSED) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_FORCEMERGING && index.status === INDEX_OPEN) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_FORCEMERGING && index.status === INDEX_CLOSED) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_CLEARING_CACHE && index.status === INDEX_OPEN) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_CLEARING_CACHE && index.status === INDEX_CLOSED) {
          delete newState[indexName];
        }
      }

      return newState;
    },
  },
  {}
);
