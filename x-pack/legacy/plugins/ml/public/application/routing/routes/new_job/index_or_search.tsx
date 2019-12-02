/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';
import { basicResolvers } from '../../resolvers';
import { Page, preConfiguredJobRedirect } from '../../../jobs/new_job/pages/index_or_search';

export const indexOrSearchRoute: MlRoute = {
  path: '/jobs/new_job/step/index_or_search',
  render: (props: any, config: any) => (
    <PageWrapper config={config} nextStepPath="#/jobs/new_job/step/job_type" />
  ),
};

export const dataVizIndexOrSearchRoute: MlRoute = {
  path: '/datavisualizer_index_select',
  render: (props: any, config: any) => (
    <PageWrapper config={config} nextStepPath="#jobs/new_job/datavisualizer" />
  ),
};

const PageWrapper: FC<{ config: any; nextStepPath: string }> = ({ config, nextStepPath }) => {
  const { context } = useResolver(undefined, config, {
    ...basicResolvers,
    preConfiguredJobRedirect,
  });
  return (
    <PageLoader context={context}>
      <Page {...{ nextStepPath }} />
    </PageLoader>
  );
};
