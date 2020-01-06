/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import queryString from 'query-string';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { Page } from '../../../jobs/new_job/recognize';
import { checkViewOrCreateJobs } from '../../../jobs/new_job/recognize/resolvers';
import { mlJobService } from '../../../services/job_service';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectIndexOrSearchLabelRecognize', {
      defaultMessage: 'Select index or search',
    }),
    href: '',
  },
];

export const recognizeRoute: MlRoute = {
  path: '/jobs/new_job/recognize',
  render: (props, config, deps) => <PageWrapper config={config} {...props} deps={deps} />,
  breadcrumbs,
};

export const checkViewOrCreateRoute: MlRoute = {
  path: '/modules/check_view_or_create',
  render: (props, config, deps) => (
    <CheckViewOrCreateWrapper config={config} {...props} deps={deps} />
  ),
  breadcrumbs: [],
};

const PageWrapper: FC<PageProps> = ({ location, config, deps }) => {
  const { id, index, savedSearchId } = queryString.parse(location.search);
  const { context, results } = useResolver(index, savedSearchId, config, {
    ...basicResolvers(deps),
    existingJobsAndGroups: mlJobService.getJobAndGroupIds,
  });

  return (
    <PageLoader context={context}>
      <Page moduleId={id} existingGroupIds={results.existingJobsAndGroups.groupIds} />
    </PageLoader>
  );
};

const CheckViewOrCreateWrapper: FC<PageProps> = ({ location, config, deps }) => {
  const { id: moduleId, index: indexPatternId } = queryString.parse(location.search);
  // the single resolver checkViewOrCreateJobs redirects only. so will always reject
  useResolver(undefined, undefined, config, {
    checkViewOrCreateJobs: () => checkViewOrCreateJobs(moduleId, indexPatternId),
  });
  return null;
};
