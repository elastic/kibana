/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
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
} from '../../../common/constants';

export const rowStatus = handleActions(
  {
    [clearRowStatus](state, action) {
      const { indexNames } = action.payload;
      const newState = { ...state };
      indexNames.forEach(indexName => {
        delete newState[indexName];
      });
      return newState;
    },
    [closeIndicesStart](state, action) {
      const { indexNames } = action.payload;

      const statuses = {};
      indexNames.forEach(indexName => {
        statuses[indexName] = INDEX_CLOSING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [openIndicesStart](state, action) {
      const { indexNames } = action.payload;

      const statuses = {};
      indexNames.forEach(indexName => {
        statuses[indexName] = INDEX_OPENING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [refreshIndicesStart](state, action) {
      const { indexNames } = action.payload;

      const statuses = {};
      indexNames.forEach(indexName => {
        statuses[indexName] = INDEX_REFRESHING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [flushIndicesStart](state, action) {
      const { indexNames } = action.payload;

      const statuses = {};
      indexNames.forEach(indexName => {
        statuses[indexName] = INDEX_FLUSHING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [forcemergeIndicesStart](state, action) {
      const { indexNames } = action.payload;

      const statuses = {};
      indexNames.forEach(indexName => {
        statuses[indexName] = INDEX_FORCEMERGING;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [clearCacheIndicesStart](state, action) {
      const { indexNames } = action.payload;

      const statuses = {};
      indexNames.forEach(indexName => {
        statuses[indexName] = INDEX_CLEARING_CACHE;
      });

      return {
        ...state,
        ...statuses,
      };
    },
    [reloadIndicesSuccess](state, action) {
      const { indices } = action.payload;
      const indicesByName = indices.reduce((acc, index) => {
        acc[index.name] = index;
        return acc;
      }, {});

      const newState = { ...state };
      // eslint-disable-next-line guard-for-in
      for (const indexName in state) {
        if (
          state[indexName] === INDEX_CLOSING &&
          indicesByName[indexName].status === INDEX_CLOSED
        ) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_OPENING && indicesByName[indexName].status === INDEX_OPEN) {
          delete newState[indexName];
        }
        if (
          state[indexName] === INDEX_REFRESHING &&
          indicesByName[indexName].status === INDEX_OPEN
        ) {
          delete newState[indexName];
        }
        if (
          state[indexName] === INDEX_REFRESHING &&
          indicesByName[indexName].status === INDEX_CLOSED
        ) {
          delete newState[indexName];
        }
        if (state[indexName] === INDEX_FLUSHING && indicesByName[indexName].status === INDEX_OPEN) {
          delete newState[indexName];
        }
        if (
          state[indexName] === INDEX_FLUSHING &&
          indicesByName[indexName].status === INDEX_CLOSED
        ) {
          delete newState[indexName];
        }
        if (
          state[indexName] === INDEX_FORCEMERGING &&
          indicesByName[indexName].status === INDEX_OPEN
        ) {
          delete newState[indexName];
        }
        if (
          state[indexName] === INDEX_FORCEMERGING &&
          indicesByName[indexName].status === INDEX_CLOSED
        ) {
          delete newState[indexName];
        }
        if (
          state[indexName] === INDEX_CLEARING_CACHE &&
          indicesByName[indexName].status === INDEX_OPEN
        ) {
          delete newState[indexName];
        }
        if (
          state[indexName] === INDEX_CLEARING_CACHE &&
          indicesByName[indexName].status === INDEX_CLOSED
        ) {
          delete newState[indexName];
        }
      }

      return newState;
    },
  },
  {}
);
