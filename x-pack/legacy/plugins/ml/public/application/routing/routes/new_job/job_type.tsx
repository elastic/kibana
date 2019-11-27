/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

// @ts-ignore
import queryString from 'query-string';
import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../jobs/new_job/pages/job_type/page';

export const jobTypeRoute: MlRoute = {
  path: '/jobs/new_job/step/job_type',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { index } = queryString.parse(location.search);
  const { context } = useResolver(index, config, basicResolvers);
  return (
    <PageLoader context={context}>
      <Page />
    </PageLoader>
  );
};
