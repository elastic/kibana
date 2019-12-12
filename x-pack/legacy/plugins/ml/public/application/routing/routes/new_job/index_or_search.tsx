/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { MlRoute, PageLoader, PageDependencies } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page, preConfiguredJobRedirect } from '../../../jobs/new_job/pages/index_or_search';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';
import { KibanaConfigTypeFix } from '../../../contexts/kibana';
import { checkBasicLicense } from '../../../license/check_license';
import { loadIndexPatterns } from '../../../util/index_utils';
import { checkGetJobsPrivilege } from '../../../privilege/check_privilege';
import { checkMlNodesAvailable } from '../../../ml_nodes_check';

enum MODE {
  NEW_JOB,
  DATAVISUALIZER,
}

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
    <PageWrapper
      config={config}
      nextStepPath="#/jobs/new_job/step/job_type"
      deps={deps}
      mode={MODE.NEW_JOB}
    />
  ),
  breadcrumbs,
};

export const dataVizIndexOrSearchRoute: MlRoute = {
  path: '/datavisualizer_index_select',
  render: (props, config, deps) => (
    <PageWrapper
      config={config}
      nextStepPath="#jobs/new_job/datavisualizer"
      deps={deps}
      mode={MODE.DATAVISUALIZER}
    />
  ),
  breadcrumbs,
};

const PageWrapper: FC<{
  config: KibanaConfigTypeFix;
  nextStepPath: string;
  deps: PageDependencies;
  mode: MODE;
}> = ({ config, nextStepPath, deps, mode }) => {
  const newJobResolvers = {
    ...basicResolvers(deps),
    preConfiguredJobRedirect: () => preConfiguredJobRedirect(deps.indexPatterns),
  };
  const dataVizResolvers = {
    checkBasicLicense,
    loadIndexPatterns: () => loadIndexPatterns(deps.indexPatterns),
    checkGetJobsPrivilege,
    checkMlNodesAvailable,
  };

  const { context } = useResolver(
    undefined,
    undefined,
    config,
    mode === MODE.NEW_JOB ? newJobResolvers : dataVizResolvers
  );
  return (
    <PageLoader context={context}>
      <Page {...{ nextStepPath }} />
    </PageLoader>
  );
};
