/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';
import { basicResolvers } from '../../resolvers';
import { Page, preConfiguredJobRedirect } from '../../../jobs/new_job/pages/index_or_search';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectIndexOrSearchLabel', {
      defaultMessage: 'Create job',
    }),
    href: '',
  },
];

export const indexOrSearchRoute: MlRoute = {
  path: '/jobs/new_job/step/index_or_search',
  render: (props: any, config: any) => (
    <PageWrapper config={config} nextStepPath="#/jobs/new_job/step/job_type" />
  ),
  breadcrumbs,
};

export const dataVizIndexOrSearchRoute: MlRoute = {
  path: '/datavisualizer_index_select',
  render: (props: any, config: any) => (
    <PageWrapper config={config} nextStepPath="#jobs/new_job/datavisualizer" />
  ),
  breadcrumbs,
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
