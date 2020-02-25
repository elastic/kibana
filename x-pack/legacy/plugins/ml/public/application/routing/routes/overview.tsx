/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { Redirect } from 'react-router-dom';
import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { OverviewPage } from '../../overview';

import { checkFullLicense } from '../../license/check_license';
import { checkGetJobsPrivilege } from '../../privilege/check_privilege';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { useTimefilter } from '../../contexts/kibana';
import { ML_BREADCRUMB } from '../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.overview.overviewLabel', {
      defaultMessage: 'Overview',
    }),
    href: '#/overview',
  },
];

export const overviewRoute: MlRoute = {
  path: '/overview',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context } = useResolver(undefined, undefined, deps.config, {
    checkFullLicense,
    checkGetJobsPrivilege,
    getMlNodeCount,
    loadMlServerInfo,
  });
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  return (
    <PageLoader context={context}>
      <OverviewPage />
    </PageLoader>
  );
};

export const appRootRoute: MlRoute = {
  path: '/',
  render: () => <Page />,
  breadcrumbs: [],
};

const Page: FC = () => {
  return <Redirect to="/overview" />;
};
