/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { dynamic } from '@kbn/shared-ux-utility';
import { ML_PAGES } from '../../../../locator';
import type { NavigateToPath } from '../../../contexts/kibana';
import { useMlKibana } from '../../../contexts/kibana';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { preConfiguredJobRedirect } from '../../../jobs/new_job/pages/index_or_search';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { NavigateToPageButton } from '../../components/navigate_to_page_button';

enum MODE {
  NEW_JOB,
  DATAVISUALIZER,
}

const Page = dynamic(async () => ({
  default: (await import('../../../jobs/new_job/pages/index_or_search')).Page,
}));

interface IndexOrSearchPageProps extends PageProps {
  nextStepPath: string;
  mode: MODE;
  extraButtons?: React.ReactNode;
}

const getBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.createJobLabel', {
      defaultMessage: 'Create job',
    }),
  },
];

const getDataVisBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectDateViewLabel', {
      defaultMessage: 'Select Data View',
    }),
  },
];

export const indexOrSearchRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string,
  entryPoint?: string
): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX),
  render: (props, deps) => (
    <PageWrapper
      {...props}
      nextStepPath={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE)}
      deps={deps}
      mode={MODE.NEW_JOB}
    />
  ),
  breadcrumbs: getBreadcrumbs(navigateToPath, basePath),
});

export const dataVizIndexOrSearchRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_view_datavisualizer',
  path: createPath(ML_PAGES.DATA_VISUALIZER_INDEX_SELECT),
  title: i18n.translate('xpack.ml.selectDataViewLabel', {
    defaultMessage: 'Select Data View',
  }),
  render: (props, deps) => {
    const button = (
      <NavigateToPageButton
        nextStepPath={createPath(ML_PAGES.DATA_VISUALIZER_ESQL)}
        title={
          <FormattedMessage
            id="xpack.ml.datavisualizer.selector.useESQLButtonLabel"
            defaultMessage="Use ES|QL"
          />
        }
      />
    );
    return (
      <PageWrapper
        {...props}
        nextStepPath={createPath(ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER)}
        deps={deps}
        mode={MODE.DATAVISUALIZER}
        extraButtons={button}
      />
    );
  },
  breadcrumbs: getDataVisBreadcrumbs(navigateToPath, basePath),
});

const PageWrapper: FC<IndexOrSearchPageProps> = ({ nextStepPath, mode, extraButtons }) => {
  const {
    services: {
      http: { basePath },
      application: { navigateToUrl },
      data: { dataViews: dataViewsService },
    },
  } = useMlKibana();

  const newJobResolvers = {
    ...basicResolvers(),
    preConfiguredJobRedirect: () =>
      preConfiguredJobRedirect(dataViewsService, basePath.get(), navigateToUrl),
  };

  const { context } = useRouteResolver(
    mode === MODE.NEW_JOB ? 'full' : 'basic',
    mode === MODE.NEW_JOB ? ['canCreateJob'] : [],
    mode === MODE.NEW_JOB ? newJobResolvers : {}
  );
  return (
    <PageLoader context={context}>
      <Page {...{ nextStepPath, extraButtons }} />
    </PageLoader>
  );
};
