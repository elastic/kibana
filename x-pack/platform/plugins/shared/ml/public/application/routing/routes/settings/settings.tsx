/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useTimefilter } from '@kbn/ml-date-picker';
import { dynamic } from '@kbn/shared-ux-utility';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../../router';
import { PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

const Settings = dynamic(async () => ({
  default: (await import('../../../settings')).Settings,
}));

export const settingsRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'settings',
  path: '',
  title: i18n.translate('xpack.ml.settings.docTitle', {
    defaultMessage: 'Settings',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB'),
  ],
});

const PageWrapper: FC = () => {
  const { context } = useRouteResolver('full', ['canGetJobs'], {
    getMlNodeCount,
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  return (
    <PageLoader context={context}>
      <Settings />
    </PageLoader>
  );
};
