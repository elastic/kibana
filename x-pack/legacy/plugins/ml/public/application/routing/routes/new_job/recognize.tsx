/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
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
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
};

export const checkViewOrCreateRoute: MlRoute = {
  path: '/modules/check_view_or_create',
  render: (props, deps) => <CheckViewOrCreateWrapper {...props} deps={deps} />,
  breadcrumbs: [],
};

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { id, index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });
  const { context, results } = useResolver(index, savedSearchId, deps.config, {
    ...basicResolvers(deps),
    existingJobsAndGroups: mlJobService.getJobAndGroupIds,
  });

  return (
    <PageLoader context={context}>
      <Page moduleId={id} existingGroupIds={results.existingJobsAndGroups.groupIds} />
    </PageLoader>
  );
};

const CheckViewOrCreateWrapper: FC<PageProps> = ({ location, deps }) => {
  const { id: moduleId, index: indexPatternId }: Record<string, any> = parse(location.search, {
    sort: false,
  });

  // the single resolver checkViewOrCreateJobs redirects only. so will always reject
  useResolver(undefined, undefined, deps.config, {
    checkViewOrCreateJobs: () => checkViewOrCreateJobs(moduleId, indexPatternId),
  });
  return null;
};
