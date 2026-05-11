/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import type { MlRoute } from '../router';
import { createPath } from '../router';

export const dataVizIndexOrSearchRouteFactory = (): MlRoute => ({
  id: 'data_view_datavisualizer',
  path: createPath(ML_PAGES.DATA_VISUALIZER_INDEX_SELECT),
  render: ({ location }) => (
    <Redirect to={`${createPath(ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER)}${location.search}`} />
  ),
  breadcrumbs: [],
});
