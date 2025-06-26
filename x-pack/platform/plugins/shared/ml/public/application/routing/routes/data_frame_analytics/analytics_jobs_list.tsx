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
import type { MlRoute } from '../../router';
import { PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers, initSavedObjects } from '../../resolvers';
import { type NavigateToApp, getStackManagementBreadcrumb } from '../../breadcrumbs';

const Page = dynamic(async () => ({
  default: (await import('../../../data_frame_analytics/pages/analytics_management')).Page,
}));

export const analyticsJobsListRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  id: 'analytics',
  path: '/',
  title: i18n.translate('xpack.ml.dataFrameAnalytics.jobs.docTitle', {
    defaultMessage: 'Data Frame Analytics Jobs',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getStackManagementBreadcrumb(navigateToApp),
    {
      text: i18n.translate('xpack.ml.dataFrameAnalyticsBreadcrumbs.jobsManagementLabel', {
        defaultMessage: 'Data Frame Analytics Jobs',
      }),
    },
  ],
  'data-test-subj': 'mlPageDataFrameAnalytics',
  enableDatePicker: false,
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetDataFrameAnalytics'], {
    ...basicResolvers(),
    initSavedObjects,
  });
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
