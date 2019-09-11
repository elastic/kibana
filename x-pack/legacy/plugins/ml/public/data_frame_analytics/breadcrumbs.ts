/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

// @ts-ignore
import { ML_BREADCRUMB } from '../breadcrumbs';

const DATA_FRAME_ANALYTICS_BREADCRUMB = {
  text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.dataFrameLabel', {
    defaultMessage: 'Data Frame Analytics',
  }),
  href: '#/data_frame_analytics?',
};

export function getDataFrameAnalyticsManagementBreadcrumbs() {
  return [
    ML_BREADCRUMB,
    DATA_FRAME_ANALYTICS_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsManagementBreadcrumbs.dataFrameLabel', {
        defaultMessage: 'Job Management',
      }),
      href: '',
    },
  ];
}

export function getDataFrameAnalyticsExplorationBreadcrumbs() {
  return [
    ML_BREADCRUMB,
    DATA_FRAME_ANALYTICS_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsExplorationBreadcrumbs.dataFrameLabel', {
        defaultMessage: 'Exploration',
      }),
      href: '',
    },
  ];
}
