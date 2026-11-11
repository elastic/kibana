/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-export shared farequote Discover session fixtures owned by data_visualizer.
 * Keeping them there avoids a moon/project-graph cycle (ml already depends on data_visualizer).
 */
export {
  DATA_VIEW_ID_PLACEHOLDER,
  FAREQUOTE_ES_ARCHIVE,
  IHP_OUTLIER_ES_ARCHIVE,
  FAREQUOTE_INDEX,
  IHP_OUTLIER_INDEX,
  TIME_FIELD_NAME,
  FAREQUOTE_SAVED_SEARCHES,
  FAREQUOTE_SAVED_SEARCH_SETS,
  FAREQUOTE_KUERY_SAVED_SEARCH_ID,
  SAVED_SEARCH_TITLE,
  savedSearchIdForTitle,
  injectDataViewId,
  toDiscoverSessionCreateAttributes,
  buildDiscoverSessionAttributes,
  createFarequoteSavedSearch,
  createFarequoteSavedSearchIfNeeded,
  createFarequoteSavedSearches,
  createFarequoteKuerySavedSearch,
  createSavedSearchFarequoteKueryIfNeeded,
  createSavedSearchFarequoteFilterAndKueryIfNeeded,
  deleteFarequoteSavedSearches,
  deleteAllFarequoteSavedSearches,
} from '@kbn/data-visualizer-plugin/test/scout/ui/fixtures/farequote_saved_searches';

export type {
  FarequoteSavedSearchSpec,
  FarequoteSavedSearchKey,
} from '@kbn/data-visualizer-plugin/test/scout/ui/fixtures/farequote_saved_searches';
