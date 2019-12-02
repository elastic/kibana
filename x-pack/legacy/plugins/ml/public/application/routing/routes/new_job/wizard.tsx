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
import { Page } from '../../../jobs/new_job/pages/new_job';
import { JOB_TYPE } from '../../../jobs/new_job/common/job_creator/util/constants';
import { mlJobService } from '../../../services/job_service';
import { loadNewJobCapabilities } from '../../../services/new_job_capabilities_service';
import { checkCreateJobsPrivilege } from '../../../privilege/check_privilege';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const baseBreadcrumbs = [ML_BREADCRUMB, ANOMALY_DETECTION_BREADCRUMB];

const singleMetricBreadCrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.singleMetricLabel', {
      defaultMessage: 'Single metric',
    }),
    href: '',
  },
];

const multiMetricBreadCrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.multiMetricLabel', {
      defaultMessage: 'Multi metric',
    }),
    href: '',
  },
];

const populationBreadCrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.populationLabel', {
      defaultMessage: 'Population',
    }),
    href: '',
  },
];

const advancedBreadCrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.advancedConfigurationLabel', {
      defaultMessage: 'Advanced configuration',
    }),
    href: '',
  },
];

export const singleMetricRoute: MlRoute = {
  path: '/jobs/new_job/single_metric',
  render: (props: any, config: any) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.SINGLE_METRIC} />
  ),
  breadcrumbs: singleMetricBreadCrumbs,
};

export const multiMetricRoute: MlRoute = {
  path: '/jobs/new_job/multi_metric',
  render: (props: any, config: any) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.MULTI_METRIC} />
  ),
  breadcrumbs: multiMetricBreadCrumbs,
};

export const populationRoute: MlRoute = {
  path: '/jobs/new_job/population',
  render: (props: any, config: any) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.POPULATION} />
  ),
  breadcrumbs: populationBreadCrumbs,
};

export const advancedRoute: MlRoute = {
  path: '/jobs/new_job/advanced',
  render: (props: any, config: any) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.ADVANCED} />
  ),
  breadcrumbs: advancedBreadCrumbs,
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
