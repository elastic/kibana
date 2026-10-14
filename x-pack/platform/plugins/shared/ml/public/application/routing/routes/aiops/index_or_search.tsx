/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import type { MlRoute } from '../../router';
import { createPath } from '../../router';

export const logRateAnalysisIndexOrSearchRouteFactory = (): MlRoute => ({
  id: 'data_view_log_rate_analysis',
  path: createPath(ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT),
  render: ({ location }) => (
    <Redirect to={`${createPath(ML_PAGES.AIOPS_LOG_RATE_ANALYSIS)}${location.search}`} />
  ),
  breadcrumbs: [],
});

/**
 * @deprecated since 8.10, kept here to redirect old bookmarks.
 */
export const explainLogRateSpikesIndexOrSearchRouteFactory = (): MlRoute => ({
  path: createPath(ML_PAGES.AIOPS_EXPLAIN_LOG_RATE_SPIKES_INDEX_SELECT),
  render: () => <Redirect to={createPath(ML_PAGES.AIOPS_LOG_RATE_ANALYSIS_INDEX_SELECT)} />,
  breadcrumbs: [],
});

export const logCategorizationIndexOrSearchRouteFactory = (): MlRoute => ({
  id: 'data_view_log_categorization',
  path: createPath(ML_PAGES.AIOPS_LOG_CATEGORIZATION_INDEX_SELECT),
  render: ({ location }) => (
    <Redirect to={`${createPath(ML_PAGES.AIOPS_LOG_CATEGORIZATION)}${location.search}`} />
  ),
  breadcrumbs: [],
});

export const changePointDetectionIndexOrSearchRouteFactory = (): MlRoute => ({
  id: 'data_view_change_point_detection',
  path: createPath(ML_PAGES.AIOPS_CHANGE_POINT_DETECTION_INDEX_SELECT),
  render: ({ location }) => (
    <Redirect to={`${createPath(ML_PAGES.AIOPS_CHANGE_POINT_DETECTION)}${location.search}`} />
  ),
  breadcrumbs: [],
});
