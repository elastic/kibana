/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
// @ts-ignore
import queryString from 'query-string';

import { useResolver } from '../../router';
import { basicResolvers } from '../../resolvers';
import { MlRoute, PageLoader } from '../../router';
import { Page } from '../../../jobs/new_job/pages/new_job';
import { JOB_TYPE } from '../../../jobs/new_job/common/job_creator/util/constants';
import { mlJobService } from '../../../services/job_service';
import { loadNewJobCapabilities } from '../../../services/new_job_capabilities_service';
import { checkCreateJobsPrivilege } from '../../../privilege/check_privilege';

export const singleMetricRoute: MlRoute = {
  path: '/jobs/new_job/single_metric',
  render: (props: any, config: any) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.SINGLE_METRIC} />
  ),
};

export const multiMetricRoute: MlRoute = {
  path: '/jobs/new_job/multi_metric',
  render: (props: any, config: any) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.MULTI_METRIC} />
  ),
};

export const populationRoute: MlRoute = {
  path: '/jobs/new_job/population',
  render: (props: any, config: any) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.POPULATION} />
  ),
};

export const advancedRoute: MlRoute = {
  path: '/jobs/new_job/advanced',
  render: (props: any, config: any) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.ADVANCED} />
  ),
};

const PageWrapper: FC<{ location: any; config: any; jobType: JOB_TYPE }> = ({
  location,
  config,
  jobType,
}) => {
  const { index } = queryString.parse(location.search);
  const { context, results } = useResolver(index, config, {
    ...basicResolvers,
    privileges: checkCreateJobsPrivilege,
    jobCaps: () => loadNewJobCapabilities(index, ''),
    existingJobsAndGroups: mlJobService.getJobAndGroupIds,
  });

  return (
    <PageLoader context={context}>
      <Page jobType={jobType} existingJobsAndGroups={results.existingJobsAndGroups} />
    </PageLoader>
  );
};
