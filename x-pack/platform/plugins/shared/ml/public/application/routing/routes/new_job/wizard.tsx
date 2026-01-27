/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'query-string';
import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Redirect } from 'react-router-dom';
import { dynamic } from '@kbn/shared-ux-utility';
import { DataSourceContextProvider } from '../../../contexts/ml/data_source_context';
import { useMlKibana } from '../../../contexts/kibana';
import { basicResolvers } from '../../resolvers';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
import {
  loadNewJobCapabilities,
  ANOMALY_DETECTOR,
} from '../../../services/new_job_capabilities/load_new_job_capabilities';
import { checkCreateJobsCapabilitiesResolver } from '../../../capabilities/check_capabilities';
import {
  type NavigateToApp,
  getStackManagementBreadcrumb,
  getMlManagementBreadcrumb,
} from '../../breadcrumbs';
import { useCreateAndNavigateToMlLink } from '../../../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../../../common/constants/locator';

interface WizardPageProps extends PageProps {
  jobType: JOB_TYPE;
}

const Page = dynamic(async () => ({
  default: (await import('../../../jobs/new_job/pages/new_job')).Page,
}));

const getBaseBreadcrumbs = (navigateToApp: NavigateToApp) => [
  getStackManagementBreadcrumb(navigateToApp),
  getMlManagementBreadcrumb('ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB', navigateToApp),
  getMlManagementBreadcrumb('CREATE_JOB_MANAGEMENT_BREADCRUMB', navigateToApp),
];

const getSingleMetricBreadcrumbs = (navigateToApp: NavigateToApp) => [
  ...getBaseBreadcrumbs(navigateToApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.singleMetricLabel', {
      defaultMessage: 'Single metric',
    }),
    href: '',
  },
];

const getMultiMetricBreadcrumbs = (navigateToApp: NavigateToApp) => [
  ...getBaseBreadcrumbs(navigateToApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.multiMetricLabel', {
      defaultMessage: 'Multi-metric',
    }),
    href: '',
  },
];

const getPopulationBreadcrumbs = (navigateToApp: NavigateToApp) => [
  ...getBaseBreadcrumbs(navigateToApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.populationLabel', {
      defaultMessage: 'Population',
    }),
    href: '',
  },
];

const getAdvancedBreadcrumbs = (navigateToApp: NavigateToApp) => [
  ...getBaseBreadcrumbs(navigateToApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.advancedConfigurationLabel', {
      defaultMessage: 'Advanced configuration',
    }),
    href: '',
  },
];

const getCategorizationBreadcrumbs = (navigateToApp: NavigateToApp) => [
  ...getBaseBreadcrumbs(navigateToApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.categorizationLabel', {
      defaultMessage: 'Categorization',
    }),
    href: '',
  },
];

const getRareBreadcrumbs = (navigateToApp: NavigateToApp) => [
  ...getBaseBreadcrumbs(navigateToApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.rareLabel', {
      defaultMessage: 'Rare',
    }),
    href: '',
  },
];

const getGeoBreadcrumbs = (navigateToApp: NavigateToApp) => [
  ...getBaseBreadcrumbs(navigateToApp),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.geoLabel', {
      defaultMessage: 'Geo',
    }),
    href: '',
  },
];

export const singleMetricRouteFactory = (navigateToApp: NavigateToApp): MlRoute => {
  return {
    path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SINGLE_METRIC),
    render: (props, deps) => (
      <PageWrapper {...props} jobType={JOB_TYPE.SINGLE_METRIC} deps={deps} />
    ),
    breadcrumbs: getSingleMetricBreadcrumbs(navigateToApp),
  };
};

export const multiMetricRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_MULTI_METRIC),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.MULTI_METRIC} deps={deps} />,
  breadcrumbs: getMultiMetricBreadcrumbs(navigateToApp),
});

// redirect route to reset the job wizard when converting to multi metric job
export const multiMetricRouteFactoryRedirect = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_MULTI_METRIC),
  render: (props) => {
    return (
      <Redirect
        to={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_MULTI_METRIC, props.location.search)}
      />
    );
  },

  breadcrumbs: [],
});

export const populationRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_POPULATION),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.POPULATION} deps={deps} />,
  breadcrumbs: getPopulationBreadcrumbs(navigateToApp),
});

export const advancedRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.ADVANCED} deps={deps} />,
  breadcrumbs: getAdvancedBreadcrumbs(navigateToApp),
});

// redirect route to reset the job wizard when converting to advanced job
export const advancedRouteFactoryRedirect = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_CONVERT_TO_ADVANCED),
  render: (props) => (
    <Redirect
      to={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED, props.location.search)}
    />
  ),
  breadcrumbs: [],
});

export const categorizationRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_CATEGORIZATION),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.CATEGORIZATION} deps={deps} />,
  breadcrumbs: getCategorizationBreadcrumbs(navigateToApp),
});

export const rareRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_RARE),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.RARE} deps={deps} />,
  breadcrumbs: getRareBreadcrumbs(navigateToApp),
});

export const geoRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_GEO),
  render: (props, deps) => <PageWrapper {...props} jobType={JOB_TYPE.GEO} deps={deps} />,
  breadcrumbs: getGeoBreadcrumbs(navigateToApp),
});

const PageWrapper: FC<WizardPageProps> = ({ location, jobType }) => {
  const redirectToJobsManagementPage = useCreateAndNavigateToMlLink(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE
  );

  const { index, savedSearchId }: Record<string, any> = parse(location.search, { sort: false });

  const {
    services: {
      data: { dataViews: dataViewsService },
      savedSearch: savedSearchService,
      mlServices: { mlApi },
      notifications,
    },
  } = useMlKibana();
  const { context, results } = useRouteResolver('full', ['canGetJobs', 'canCreateJob'], {
    ...basicResolvers(),
    // TODO useRouteResolver should be responsible for the redirect
    privileges: () => checkCreateJobsCapabilitiesResolver(mlApi, redirectToJobsManagementPage),
    jobCaps: () =>
      loadNewJobCapabilities(
        index,
        savedSearchId,
        mlApi,
        dataViewsService,
        savedSearchService,
        ANOMALY_DETECTOR,
        notifications
      ),
    existingJobsAndGroups: () => mlApi.jobs.getAllJobAndGroupIds(),
  });

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        {results ? (
          <Page jobType={jobType} existingJobsAndGroups={results.existingJobsAndGroups} />
        ) : null}
      </DataSourceContextProvider>
    </PageLoader>
  );
};
