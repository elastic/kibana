/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useTimefilter } from '@kbn/ml-date-picker';
import type { FC } from 'react';
import React, { Suspense } from 'react';
import { Redirect } from 'react-router-dom';
import { ML_PAGES } from '../../../locator';
import type { NavigateToPath } from '../../contexts/kibana';
import { useEnabledFeatures } from '../../contexts/ml/serverless_context';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import type { MlRoute, PageProps } from '../router';
import { createPath, PageLoader } from '../router';
import { useRouteResolver } from '../use_resolver';
import { initSavedObjects } from '../resolvers';

const OverviewPage = React.lazy(() => import('../../overview/overview_page'));

export const overviewRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'overview',
  path: createPath(ML_PAGES.OVERVIEW),
  title: i18n.translate('xpack.ml.overview.overviewLabel', {
    defaultMessage: 'Overview',
  }),
  enableDatePicker: true,
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.overview.overviewLabel', {
        defaultMessage: 'Overview',
      }),
    },
  ],
  'data-test-subj': 'mlPageOverview',
});

const PageWrapper: FC<PageProps> = () => {
  const { context } = useRouteResolver('full', ['canGetMlInfo'], {
    getMlNodeCount,
    loadMlServerInfo,
    initSavedObjects,
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  return (
    <PageLoader context={context}>
      {/* No fallback yet, we don't show a loading spinner on an outer level until context is available either. */}
      <Suspense fallback={null}>
        <OverviewPage />
      </Suspense>
    </PageLoader>
  );
};

export const appRootRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  id: '',
  path: '/',
  render: () => <Page />,
  breadcrumbs: [],
});

const Page: FC = () => {
  const { isADEnabled, isDFAEnabled, isNLPEnabled } = useEnabledFeatures();
  if (isADEnabled === false && isDFAEnabled === false && isNLPEnabled === true) {
    // if only NLP is enabled, redirect to the trained models page.
    // in the search serverless project, the overview page is blank, so we
    // need to redirect to the trained models page instead
    return <Redirect to={createPath(ML_PAGES.TRAINED_MODELS_MANAGE)} />;
  }

  return <Redirect to={createPath(ML_PAGES.OVERVIEW)} />;
};
