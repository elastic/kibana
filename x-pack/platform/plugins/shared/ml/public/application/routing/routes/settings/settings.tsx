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
import type { MlRoute } from '../../router';
import { PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import {
  type NavigateToApp,
  getStackManagementBreadcrumb,
  getMlManagementBreadcrumb,
} from '../../breadcrumbs';

const Settings = dynamic(async () => ({
  default: (await import('../../../settings')).Settings,
}));

export const settingsRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  id: 'settings',
  path: '/',
  title: i18n.translate('xpack.ml.settings.docTitle', {
    defaultMessage: 'Anomaly Detection Settings',
  }),
  render: () => <PageWrapper />,
  breadcrumbs: [
    getStackManagementBreadcrumb(navigateToApp),
    getMlManagementBreadcrumb('ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB', navigateToApp),
    {
      text: i18n.translate('xpack.ml.settingsLabel', {
        defaultMessage: 'Anomaly Detection Settings',
      }),
    },
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
