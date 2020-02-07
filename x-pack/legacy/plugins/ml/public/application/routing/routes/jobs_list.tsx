/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { JobsPage } from '../../jobs/jobs_list';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.anomalyDetection.jobManagementLabel', {
      defaultMessage: 'Job Management',
    }),
    href: '',
  },
];

export const jobListRoute: MlRoute = {
  path: '/jobs',
  render: (props, config, deps) => <PageWrapper config={config} {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ config, deps }) => {
  const { context } = useResolver(undefined, undefined, config, basicResolvers(deps));

  return (
    <PageLoader context={context}>
      <JobsPage />
    </PageLoader>
  );
};
