/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reset the CCR Redux store to its initial state.
 * This should be called in beforeEach to ensure test isolation when the store is a singleton.
 *
 * Clears:
 * - Selected follower index ID (edit and detail)
 * - Selected auto-follow pattern ID (edit and detail)
 * - Cached follower index data
 * - Cached auto-follow pattern data
 *
 * @example
 * beforeEach(() => {
 *   jest.clearAllMocks();
 *   resetCcrStore();
 * });
 */
export const resetCcrStore = () => {
  const { ccrStore } = require('../../../app/store');

  // Dispatch actions to clear selected IDs (payload is the value directly, not wrapped)
  ccrStore.dispatch({ type: 'FOLLOWER_INDEX_SELECT_EDIT', payload: null });
  ccrStore.dispatch({ type: 'FOLLOWER_INDEX_SELECT_DETAIL', payload: null });
  ccrStore.dispatch({ type: 'AUTO_FOLLOW_PATTERN_SELECT_EDIT', payload: null });
  ccrStore.dispatch({ type: 'AUTO_FOLLOW_PATTERN_SELECT_DETAIL', payload: null });

  // Clear the byId caches to prevent stale data between tests
  // HTTP mocks will repopulate these after component renders
  ccrStore.getState().followerIndex.byId = {};
  ccrStore.getState().autoFollowPattern.byId = {};
};
