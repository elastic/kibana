/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Redirect } from 'react-router-dom';
import { MlRoute, PageLoader } from '../router';
import { useResolver } from '../router';
import { KibanaConfigTypeFix } from '../../contexts/kibana';
import { OverviewPage } from '../../overview';

import { checkFullLicense } from '../../license/check_license';
import { checkGetJobsPrivilege } from '../../privilege/check_privilege';
import { getMlNodeCount } from '../../ml_nodes_check';
import { loadMlServerInfo } from '../../services/ml_server_info';

export const jobListRoute: MlRoute = {
  path: '/overview',
  render: (props: any, config: any) => <PageWrapper config={config} />,
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
};

const Page: FC = () => {
  return <Redirect to="/overview" />;
};
