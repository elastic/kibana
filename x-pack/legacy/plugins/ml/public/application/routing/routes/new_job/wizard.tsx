/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import queryString from 'query-string';

import { basicResolvers } from '../../resolvers';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { Page } from '../../../jobs/new_job/pages/new_job';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
import { mlJobService } from '../../../services/job_service';
import { loadNewJobCapabilities } from '../../../services/new_job_capabilities_service';
import { checkCreateJobsPrivilege } from '../../../privilege/check_privilege';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

interface WizardPageProps extends PageProps {
  jobType: JOB_TYPE;
}

const createJobBreadcrumbs = {
  text: i18n.translate('xpack.ml.jobsBreadcrumbs.createJobLabel', {
    defaultMessage: 'Create job',
  }),
  href: '#/jobs/new_job',
};

const baseBreadcrumbs = [ML_BREADCRUMB, ANOMALY_DETECTION_BREADCRUMB, createJobBreadcrumbs];

const singleMetricBreadcrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.singleMetricLabel', {
      defaultMessage: 'Single metric',
    }),
    href: '',
  },
];

const multiMetricBreadcrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.multiMetricLabel', {
      defaultMessage: 'Multi metric',
    }),
    href: '',
  },
];

const populationBreadcrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.populationLabel', {
      defaultMessage: 'Population',
    }),
    href: '',
  },
];

const advancedBreadcrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.advancedConfigurationLabel', {
      defaultMessage: 'Advanced configuration',
    }),
    href: '',
  },
];

const categorizationBreadcrumbs = [
  ...baseBreadcrumbs,
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.categorizationLabel', {
      defaultMessage: 'Categorization',
    }),
    href: '',
  },
];

export const singleMetricRoute: MlRoute = {
  path: '/jobs/new_job/single_metric',
  render: (props, config, deps) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.SINGLE_METRIC} deps={deps} />
  ),
  breadcrumbs: singleMetricBreadcrumbs,
};

export const multiMetricRoute: MlRoute = {
  path: '/jobs/new_job/multi_metric',
  render: (props, config, deps) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.MULTI_METRIC} deps={deps} />
  ),
  breadcrumbs: multiMetricBreadcrumbs,
};

export const populationRoute: MlRoute = {
  path: '/jobs/new_job/population',
  render: (props, config, deps) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.POPULATION} deps={deps} />
  ),
  breadcrumbs: populationBreadcrumbs,
};

export const advancedRoute: MlRoute = {
  path: '/jobs/new_job/advanced',
  render: (props, config, deps) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.ADVANCED} deps={deps} />
  ),
  breadcrumbs: advancedBreadcrumbs,
};

export const categorizationRoute: MlRoute = {
  path: '/jobs/new_job/categorization',
  render: (props, config, deps) => (
    <PageWrapper config={config} {...props} jobType={JOB_TYPE.CATEGORIZATION} deps={deps} />
  ),
  breadcrumbs: categorizationBreadcrumbs,
};

const PageWrapper: FC<WizardPageProps> = ({ location, config, jobType, deps }) => {
  const { index, savedSearchId } = queryString.parse(location.search);
  const { context, results } = useResolver(index, savedSearchId, config, {
    ...basicResolvers(deps),
    privileges: checkCreateJobsPrivilege,
    jobCaps: () => loadNewJobCapabilities(index, savedSearchId, deps.indexPatterns),
    existingJobsAndGroups: mlJobService.getJobAndGroupIds,
  });

  return (
    <PageLoader context={context}>
      <Page jobType={jobType} existingJobsAndGroups={results.existingJobsAndGroups} />
    </PageLoader>
  );
};
