/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React from 'react';
import {
  DataDriftIndexOrSearchRedirect,
  DataDriftIndexPatternsPicker,
} from '../../../datavisualizer/data_drift/index_patterns_picker';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../..';
import type { PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { ML_PAGES } from '../../../../../common/constants/locator';
import {
  breadcrumbOnClickFactory,
  DATA_DRIFT_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  getBreadcrumbWithUrlForApp,
} from '../../breadcrumbs';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { DataSourceContextProvider } from '../../../contexts/ml';

export const dataDriftRouteIndexOrSearchFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_drift',
  path: createPath(ML_PAGES.DATA_DRIFT_INDEX_SELECT),
  title: i18n.translate('xpack.ml.dataVisualizer.dataDrift.docTitle', {
    defaultMessage: 'Data Drift',
  }),
  render: (props, deps) => (
    <PageWrapper {...props} deps={deps} mode={ML_PAGES.DATA_DRIFT_INDEX_SELECT} />
  ),
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: DATA_VISUALIZER_BREADCRUMB.text,
      ...(navigateToPath
        ? {
            href: `${basePath}/app/ml${DATA_DRIFT_BREADCRUMB.href}`,
            onClick: breadcrumbOnClickFactory(DATA_DRIFT_BREADCRUMB.href, navigateToPath),
          }
        : {}),
    },
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.dataDriftLabel', {
        defaultMessage: 'Data Drift',
      }),
    },
  ],
  'data-test-subj': 'mlPageDataDrift',
});

export const dataDriftRouteIndexPatternFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_drift',
  path: createPath(ML_PAGES.DATA_DRIFT_CUSTOM),
  title: i18n.translate('xpack.ml.dataVisualizer.dataDriftCustomIndexPatterns.docTitle', {
    defaultMessage: 'Data Drift Custom Index Patterns',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={ML_PAGES.DATA_DRIFT_CUSTOM} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    {
      text: DATA_VISUALIZER_BREADCRUMB.text,
      ...(navigateToPath
        ? {
            href: `${basePath}/app/ml${DATA_DRIFT_BREADCRUMB.href}`,
            onClick: breadcrumbOnClickFactory(DATA_DRIFT_BREADCRUMB.href, navigateToPath),
          }
        : {}),
    },
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.dataDriftLabel', {
        defaultMessage: 'Data Drift',
      }),
    },
  ],
  'data-test-subj': 'mlPageDataDriftCustomIndexPatterns',
});

interface DataDriftPageProps extends PageProps {
  mode: 'data_drift_index_select' | 'data_drift_custom';
}
const PageWrapper: FC<DataDriftPageProps> = ({ mode }) => {
  const { context } = useRouteResolver('full', [], basicResolvers());

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        {mode === ML_PAGES.DATA_DRIFT_INDEX_SELECT ? (
          <DataDriftIndexOrSearchRedirect />
        ) : (
          <DataDriftIndexPatternsPicker />
        )}
      </DataSourceContextProvider>
    </PageLoader>
  );
};
