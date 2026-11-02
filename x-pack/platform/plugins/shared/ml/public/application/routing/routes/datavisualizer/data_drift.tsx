/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React from 'react';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { DataDriftIndexPatternsPicker } from '../../../datavisualizer/data_drift/index_patterns_picker';
import type { NavigateToPath } from '../../../contexts/kibana';
import type { MlRoute } from '../..';
import type { PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { DataSourceContextProvider } from '../../../contexts/ml';

export const dataDriftRouteIndexPatternFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  id: 'data_drift',
  path: createPath(ML_PAGES.DATA_DRIFT_CUSTOM),
  title: i18n.translate('xpack.ml.dataVisualizer.dataDriftCustomIndexPatterns.docTitle', {
    defaultMessage: 'Data Drift Custom Index Patterns',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.dataDriftLabel', {
        defaultMessage: 'Data Drift',
      }),
    },
  ],
  'data-test-subj': 'mlPageDataDriftCustomIndexPatterns',
});

type DataDriftPageProps = PageProps;
const PageWrapper: FC<DataDriftPageProps> = () => {
  const { context } = useRouteResolver('full', [], basicResolvers());

  return (
    <PageLoader context={context}>
      <DataSourceContextProvider>
        <DataDriftIndexPatternsPicker />
      </DataSourceContextProvider>
    </PageLoader>
  );
};
