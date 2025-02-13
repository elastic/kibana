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
import { basicResolvers } from '../../resolvers';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { DataSourceContextProvider } from '../../../contexts/ml';

const Page = dynamic(async () => ({
  default: (await import('../../../jobs/new_job/pages/job_type')).Page,
}));

export const jobTypeRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectJobType', {
        defaultMessage: 'Create job',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetJobs'], basicResolvers());

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <Page />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
