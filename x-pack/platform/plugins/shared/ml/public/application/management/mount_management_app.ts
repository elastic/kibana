/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import React from 'react';
import type { CoreSetup } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { MlFeatures, NLPSettings, ExperimentalFeatures } from '../../../common/constants/app';
import type { MlStartDependencies } from '../../plugin';
import { getJobsListBreadcrumbs } from './breadcrumbs';
import { App } from '../app';

const renderApp = (
  coreStart: CoreSetup<MlStartDependencies>,
  params: ManagementAppMountParams,
  deps: any,
  isServerless: boolean,
  mlFeatures: MlFeatures,
  experimentalFeatures: ExperimentalFeatures,
  nlpSettings: NLPSettings,
  entryPoint: string
) => {
  ReactDOM.render(
    React.createElement(App, {
      coreStart,
      deps,
      appMountParams: params,
      isServerless,
      mlFeatures,
      experimentalFeatures,
      nlpSettings,
      entryPoint,
    }),
    params.element
  );

  return () => {
    unmountComponentAtNode(params.element);
    deps.data.search.session.clear();
  };
};

export async function mountApp(
  core: CoreSetup<MlStartDependencies>,
  params: ManagementAppMountParams,
  deps: { usageCollection?: UsageCollectionSetup },
  isServerless: boolean,
  mlFeatures: MlFeatures,
  experimentalFeatures: ExperimentalFeatures,
  nlpSettings: NLPSettings,
  entryPoint: string
) {
  const [coreStart] = await core.getStartServices();

  params.setBreadcrumbs(getJobsListBreadcrumbs()); // TODO: update breadcrumbs depending on section
  return renderApp(
    coreStart,
    params,
    deps,
    isServerless,
    mlFeatures,
    experimentalFeatures,
    nlpSettings,
    entryPoint
  );
}
