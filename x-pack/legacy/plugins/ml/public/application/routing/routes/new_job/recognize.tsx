/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import queryString from 'query-string';

import { useResolver } from '../../router';
import { basicResolvers } from '../../resolvers';
import { MlRoute, PageLoader } from '../../router';
import { Page } from '../../../jobs/new_job/recognize';
import { checkViewOrCreateJobs } from '../../../jobs/new_job/recognize/resolvers';
import { mlJobService } from '../../../services/job_service';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectIndexOrSearchLabel', {
      defaultMessage: 'Select index or search',
    }),
    href: '',
  },
];

export const recognizeRoute: MlRoute = {
  path: '/jobs/new_job/recognize',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
  breadcrumbs,
};

export const checkViewOrCreateRoute: MlRoute = {
  path: '/modules/check_view_or_create',
  render: (props: any, config: any) => <CheckViewOrCreateWrapper config={config} {...props} />,
  breadcrumbs: [],
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { id, index } = queryString.parse(location.search);
  const { context, results } = useResolver(index, config, {
    ...basicResolvers,
    existingJobsAndGroups: mlJobService.getJobAndGroupIds,
  });

  return (
    <PageLoader context={context}>
      <Page moduleId={id} existingGroupIds={results.existingJobsAndGroups.groupIds} />
    </PageLoader>
  );
};

const CheckViewOrCreateWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { id: moduleId, index: indexPatternId } = queryString.parse(location.search);
  // the single resolver checkViewOrCreateJobs redirects only. so will always reject
  useResolver(undefined, config, {
    checkViewOrCreateJobs: () => checkViewOrCreateJobs(moduleId, indexPatternId),
  });
  return null;
};
