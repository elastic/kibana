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
import { basicResolvers } from '../resolvers';
import { JobsPage } from '../../jobs/jobs_list/jobs';

export const jobListRoute: MlRoute = {
  path: '/jobs',
  render: (props: any, config: any) => <PageWrapper config={config} />,
};

const PageWrapper: FC<{ config: KibanaConfigTypeFix }> = ({ config }) => {
  const { context } = useResolver(undefined, config, basicResolvers);

  return (
    <PageLoader context={context}>
      <JobsPage />
    </PageLoader>
  );
};

export const tempRoute: MlRoute = {
  path: '/',
  render: (props: any, config: any) => <Page />,
};

const Page: FC = () => {
  return <Redirect to="/jobs" />;
};
