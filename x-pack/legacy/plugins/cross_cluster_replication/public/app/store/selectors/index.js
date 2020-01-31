/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { objectToArray } from '../../services/utils';
import { API_STATUS } from '../../constants';

// Api
export const getApiState = state => state.api;
export const getApiStatus = scope =>
  createSelector(
    getApiState,
    apiState => apiState.status[scope] || API_STATUS.IDLE
  );
export const getApiError = scope =>
  createSelector(
    getApiState,
    apiState => apiState.error[scope]
  );
export const isApiAuthorized = scope =>
  createSelector(
    getApiError(scope),
    error => {
      if (!error) {
        return true;
      }
      return error.status !== 403;
    }
  );

// Stats
export const getStatsState = state => state.stats;
export const getAutoFollowStats = createSelector(
  getStatsState,
  statsState => statsState.autoFollow
);

// Auto-follow pattern
export const getAutoFollowPatternState = state => state.autoFollowPattern;
export const getAutoFollowPatterns = createSelector(
  getAutoFollowPatternState,
  autoFollowPatternsState => autoFollowPatternsState.byId
);
export const getSelectedAutoFollowPatternId = (view = 'detail') =>
  createSelector(
    getAutoFollowPatternState,
    autoFollowPatternsState =>
      view === 'detail'
        ? autoFollowPatternsState.selectedDetailId
        : autoFollowPatternsState.selectedEditId
  );
export const getSelectedAutoFollowPattern = (view = 'detail') =>
  createSelector(
    getAutoFollowPatternState,
    getAutoFollowStats,
    (autoFollowPatternsState, autoFollowStatsState) => {
      const propId = view === 'detail' ? 'selectedDetailId' : 'selectedEditId';

      if (!autoFollowPatternsState[propId]) {
        return null;
      }
      const id = autoFollowPatternsState[propId];
      const autoFollowPattern = autoFollowPatternsState.byId[id];

      // Check if any error and merge them on the auto-follow pattern
      const errors =
        (autoFollowStatsState && autoFollowStatsState.recentAutoFollowErrors[id]) || [];
      return autoFollowPattern ? { ...autoFollowPattern, errors } : null;
    }
  );
export const getListAutoFollowPatterns = createSelector(
  getAutoFollowPatterns,
  autoFollowPatterns => objectToArray(autoFollowPatterns)
);

// Follower index
export const getFollowerIndexState = state => state.followerIndex;
export const getFollowerIndices = createSelector(
  getFollowerIndexState,
  followerIndexState => followerIndexState.byId
);
export const getSelectedFollowerIndexId = (view = 'detail') =>
  createSelector(
    getFollowerIndexState,
    followerIndexState =>
      view === 'detail' ? followerIndexState.selectedDetailId : followerIndexState.selectedEditId
  );
export const getSelectedFollowerIndex = (view = 'detail') =>
  createSelector(
    getFollowerIndexState,
    followerIndexState => {
      const propId = view === 'detail' ? 'selectedDetailId' : 'selectedEditId';

      if (!followerIndexState[propId]) {
        return null;
      }
      return followerIndexState.byId[followerIndexState[propId]];
    }
  );
export const getListFollowerIndices = createSelector(
  getFollowerIndices,
  followerIndices => objectToArray(followerIndices)
);
