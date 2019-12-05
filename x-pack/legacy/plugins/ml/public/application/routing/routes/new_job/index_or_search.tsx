/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { MlRoute, PageLoader, useResolver, PageDependencies } from '../../router';
import { basicResolvers } from '../../resolvers';
import { Page, preConfiguredJobRedirect } from '../../../jobs/new_job/pages/index_or_search';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';
import { KibanaConfigTypeFix } from '../../../contexts/kibana';

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
  render: (props, config, deps) => (
    <PageWrapper config={config} nextStepPath="#/jobs/new_job/step/job_type" deps={deps} />
  ),
  breadcrumbs,
};

export const dataVizIndexOrSearchRoute: MlRoute = {
  path: '/datavisualizer_index_select',
  render: (props, config, deps) => (
    <PageWrapper config={config} nextStepPath="#jobs/new_job/datavisualizer" deps={deps} />
  ),
  breadcrumbs,
};

const PageWrapper: FC<{
  config: KibanaConfigTypeFix;
  nextStepPath: string;
  deps: PageDependencies;
}> = ({ config, nextStepPath, deps }) => {
  const { context } = useResolver(undefined, undefined, config, {
    ...basicResolvers(deps),
    preConfiguredJobRedirect,
  });
  return (
    <PageLoader context={context}>
      <Page {...{ nextStepPath }} />
    </PageLoader>
  );
};
