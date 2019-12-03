/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { Redirect } from 'react-router-dom';
import { MlRoute, PageLoader } from '../router';
import { useResolver } from '../router';
import { KibanaConfigTypeFix } from '../../contexts/kibana';
import { OverviewPage } from '../../overview';

import { checkFullLicense } from '../../license/check_license';
import { checkGetJobsPrivilege } from '../../privilege/check_privilege';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';
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
  render: (props: any, config: any) => <PageWrapper config={config} />,
  breadcrumbs,
};

const PageWrapper: FC<{ config: KibanaConfigTypeFix }> = ({ config }) => {
  const { context } = useResolver(undefined, config, {
    checkFullLicense,
    checkGetJobsPrivilege,
    getMlNodeCount,
    loadMlServerInfo,
  });

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
