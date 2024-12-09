/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

const Page = dynamic(async () => ({
  default: (await import('../../../data_frame_analytics/pages/analytics_management')).Page,
}));

export const analyticsJobsListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_frame_analytics',
  path: createPath(ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE),
  title: i18n.translate('xpack.ml.dataFrameAnalytics.jobs.docTitle', {
    defaultMessage: 'Data Frame Analytics Jobs',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_FRAME_ANALYTICS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.jobsManagementLabel', {
        defaultMessage: 'Jobs',
      }),
    },
  ],
  'data-test-subj': 'mlPageDataFrameAnalytics',
  enableDatePicker: true,
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetDataFrameAnalytics'], basicResolvers());
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
