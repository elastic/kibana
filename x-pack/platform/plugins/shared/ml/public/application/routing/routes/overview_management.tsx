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
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { type NavigateToApp, getStackManagementBreadcrumb } from '../breadcrumbs';
import type { MlRoute, PageProps } from '../router';
import { PageLoader } from '../router'; // createPath,
import { useRouteResolver } from '../use_resolver';
import { initSavedObjects } from '../resolvers';
import { useEnabledFeatures } from '../../contexts/ml';
import { AccessDeniedCallout } from '../../access_denied';

const OverviewPage = React.lazy(() => import('../../overview/overview_page'));

export const overviewRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  id: 'overview',
  path: '/',
  title: i18n.translate('xpack.ml.management.machineLearningOverview.overviewLabel', {
    defaultMessage: 'Machine Learning Overview',
  }),
  enableDatePicker: true,
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getStackManagementBreadcrumb(navigateToApp),
    {
      text: i18n.translate('xpack.ml.management.machineLearningOverview.overviewLabel', {
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

  const { isADEnabled, isDFAEnabled, isNLPEnabled } = useEnabledFeatures();

  if (isADEnabled === false && isDFAEnabled === false && isNLPEnabled === false) {
    return <AccessDeniedCallout />;
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
