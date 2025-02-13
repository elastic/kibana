/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { useLocation, Redirect } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { dynamic } from '@kbn/shared-ux-utility';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { DataSourceContextProvider } from '../../../contexts/ml';

const Page = dynamic(async () => ({
  default: (await import('../../../aiops/log_rate_analysis')).LogRateAnalysisPage,
}));

export const logRateAnalysisRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'log_rate_analysis',
  path: createPath(ML_PAGES.AIOPS_LOG_RATE_ANALYSIS),
  title: i18n.translate('xpack.ml.aiops.logRateAnalysis.docTitle', {
    defaultMessage: 'Log rate analysis',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB_LOG_RATE_ANALYSIS', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.aiopsBreadcrumbs.logRateAnalysisLabel', {
        defaultMessage: 'Log rate analysis',
      }),
    },
  ],
});

/**
 * @deprecated since 8.10, kept here to redirect old bookmarks.
 */
export const explainLogRateSpikesRouteFactory = (): MlRoute => ({
  path: createPath(ML_PAGES.AIOPS_EXPLAIN_LOG_RATE_SPIKES),
  render: () => <RedirectWithQueryString />,
  // no breadcrumbs since it's just a redirect
  breadcrumbs: [],
});

const RedirectWithQueryString: FC = () => {
  const location = useLocation();
  return (
    <Redirect
      to={{ pathname: createPath(ML_PAGES.AIOPS_LOG_RATE_ANALYSIS), search: `${location.search}` }}
    />
  );
};

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canUseAiops']);

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <Page />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
