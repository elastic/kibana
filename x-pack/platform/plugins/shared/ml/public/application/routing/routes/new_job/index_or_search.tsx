/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '../../../../locator';
import type { MlRoute } from '../../router';
import { createPath } from '../../router';
import {
  type NavigateToApp,
  getStackManagementBreadcrumb,
  getMlManagementBreadcrumb,
} from '../../breadcrumbs';
import { PageWrapper, MODE } from './index_or_search_page_wrapper';
export { dataVizIndexOrSearchRouteFactory } from '../data_view_select';

const getBreadcrumbs = (navigateToApp: NavigateToApp) => [
  getStackManagementBreadcrumb(navigateToApp),
  getMlManagementBreadcrumb('ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB', navigateToApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.createJobLabel', {
      defaultMessage: 'Create job',
    }),
  },
];

export const indexOrSearchRouteFactory = (mlManagementLocator: any): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX),
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE)}
      deps={deps}
      mode={MODE.NEW_JOB}
    />
  ),
  breadcrumbs: getBreadcrumbs(mlManagementLocator),
});
