/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MlRoute } from '../router';
import type { NavigateToPath } from '../../contexts/kibana';
import { NavigateToPageButton } from '../components/navigate_to_page_button';
import { getBreadcrumbWithUrlForApp } from '../breadcrumbs';
import { ML_PAGES } from '../../../locator';
import { createPath } from '../router';
import { MODE, PageWrapper } from './new_job/index_or_search_page_wrapper';

const getDataVisBreadcrumbs = (navigateToPath: NavigateToPath, basePath: string) => [
  getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
  getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
  {
    text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectDateViewLabel', {
      defaultMessage: 'Select Data View',
    }),
  },
];

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
