/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { FollowerIndexWithPausedStatus } from '../../../../common/types';
import { objectToArray } from '../../services/utils';
import { API_STATUS } from '../../constants';
import type { ParsedAutoFollowError } from '../../services/auto_follow_errors';
import type { CcrApiError } from '../../services/http_error';
import { getErrorStatus } from '../../services/http_error';
import type { CcrState } from '../reducers';
import type { ParsedAutoFollowPattern } from '../reducers/auto_follow_pattern';
import type { AutoFollowStatsWithParsedErrors } from '../reducers/stats';

export type AutoFollowPatternWithErrors = ParsedAutoFollowPattern & {
  errors: ParsedAutoFollowError[];
};

// Api
export const getApiState = (state: CcrState) => state.api;
export const getApiStatus = (scope: string) =>
  createSelector(getApiState, (apiState) => apiState.status[scope] ?? API_STATUS.IDLE);
export const getApiError = (scope: string) =>
  createSelector(getApiState, (apiState) => apiState.error[scope] ?? null);
export const isApiAuthorized = (scope: string) =>
  createSelector(getApiError(scope), (error: CcrApiError | null | undefined) => {
    const status = getErrorStatus(error);
    return status !== 403;
  });

// Stats
export const getStatsState = (state: CcrState) => state.stats;
export const getAutoFollowStats = createSelector(
  getStatsState,
  (statsState): AutoFollowStatsWithParsedErrors | null => statsState.autoFollow
);

// Auto-follow pattern
export const getAutoFollowPatternState = (state: CcrState) => state.autoFollowPattern;
export const getAutoFollowPatterns = createSelector(
  getAutoFollowPatternState,
  (autoFollowPatternsState) => autoFollowPatternsState.byId
);
export const getSelectedAutoFollowPatternId = (view: 'detail' | 'edit' = 'detail') =>
  createSelector(getAutoFollowPatternState, (autoFollowPatternsState) =>
    view === 'detail'
      ? autoFollowPatternsState.selectedDetailId
      : autoFollowPatternsState.selectedEditId
  );
export const getSelectedAutoFollowPattern = (view: 'detail' | 'edit' = 'detail') =>
  createSelector(
    getAutoFollowPatternState,
    getAutoFollowStats,
    (autoFollowPatternsState, autoFollowStatsState): AutoFollowPatternWithErrors | null => {
      const propId = view === 'detail' ? 'selectedDetailId' : 'selectedEditId';

      const id = autoFollowPatternsState[propId];
      if (!id) {
        return null;
      }
      const autoFollowPattern = autoFollowPatternsState.byId[id];

      // Check if any error and merge them on the auto-follow pattern
      const errors =
        (autoFollowStatsState && autoFollowStatsState.recentAutoFollowErrors[id]) || [];
      return autoFollowPattern ? { ...autoFollowPattern, errors } : null;
    }
  );
export const getListAutoFollowPatterns = createSelector(
  getAutoFollowPatterns,
  (autoFollowPatterns) => objectToArray(autoFollowPatterns)
);

// Follower index
export const getFollowerIndexState = (state: CcrState) => state.followerIndex;
export const getFollowerIndices = createSelector(
  getFollowerIndexState,
  (followerIndexState) => followerIndexState.byId
);
export const getSelectedFollowerIndexId = (view: 'detail' | 'edit' = 'detail') =>
  createSelector(getFollowerIndexState, (followerIndexState) =>
    view === 'detail' ? followerIndexState.selectedDetailId : followerIndexState.selectedEditId
  );
export const getSelectedFollowerIndex = (view: 'detail' | 'edit' = 'detail') =>
  createSelector(
    getFollowerIndexState,
    (followerIndexState): FollowerIndexWithPausedStatus | null => {
      const propId = view === 'detail' ? 'selectedDetailId' : 'selectedEditId';

      const id = followerIndexState[propId];
      if (!id) {
        return null;
      }
      return followerIndexState.byId[id];
    }
  );
export const getListFollowerIndices = createSelector(getFollowerIndices, (followerIndices) =>
  objectToArray(followerIndices)
);
