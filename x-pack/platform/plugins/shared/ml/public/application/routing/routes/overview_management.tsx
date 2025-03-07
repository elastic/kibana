/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useTimefilter } from '@kbn/ml-date-picker';
import type { FC } from 'react';
import React, { Suspense, useEffect } from 'react';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { type NavigateToApp, getStackManagementBreadcrumb } from '../breadcrumbs';
import type { MlRoute, PageProps } from '../router';
import { PageLoader } from '../router'; // createPath,
import { useRouteResolver } from '../use_resolver';
import { initSavedObjects } from '../resolvers';
import { useEnabledFeatures } from '../../contexts/ml';
import { ML_PAGES } from '../../../../common/constants/locator';
import { useCreateAndNavigateToManagementMlLink } from '../../contexts/kibana/use_create_url';
import { AccessDeniedCallout } from '../../access_denied';

const OverviewPage = React.lazy(() => import('../../overview/overview_page'));

export const overviewRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  id: 'overview',
  path: '/',
  title: i18n.translate('xpack.ml.overview.overviewLabel', {
    defaultMessage: 'Overview',
  }),
  enableDatePicker: true,
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getStackManagementBreadcrumb(navigateToApp),
    {
      text: i18n.translate('xpack.ml.overview.overviewBreadcrumbLabel', {
        defaultMessage: 'Machine Learning Overview',
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

  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  const redirectToTrainedModels = useCreateAndNavigateToManagementMlLink(
    '',
    ML_PAGES.TRAINED_MODELS_MANAGE
  );
  const { isADEnabled, isDFAEnabled, isNLPEnabled } = useEnabledFeatures();

  useEffect(
    function redirectToTrainedModelsManagementPageIfEnabled() {
      if (isADEnabled === false && isDFAEnabled === false && isNLPEnabled === true) {
        // if only NLP is enabled, redirect to the trained models page.
        // in the search serverless project, the overview page is blank, so we
        // need to redirect to the trained models page instead
        redirectToTrainedModels();
      }
    },
    [isADEnabled, isDFAEnabled, isNLPEnabled, redirectToTrainedModels]
  );

  if (isADEnabled === false && isDFAEnabled === false && isNLPEnabled === false) {
    return <AccessDeniedCallout missingCapabilities={['contact']} />;
  }

  return (
    <PageLoader context={context}>
      {/* No fallback yet, we don't show a loading spinner on an outer level until context is available either. */}
      <Suspense fallback={null}>
        <OverviewPage timefilter={timefilter} />
      </Suspense>
    </PageLoader>
  );
};
