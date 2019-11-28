/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../data_frame_analytics/pages/analytics_management';

export const analyticsJobsListRoute: MlRoute = {
  path: '/data_frame_analytics',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { context } = useResolver('', config, basicResolvers);
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
