/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import React from 'react';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { MlFeatures } from '../../../../common/constants/app';
import type { MlStartDependencies } from '../../../plugin';
import { AnomalyDetectionJobsPage } from './components';
import { getJobsListBreadcrumbs } from '../breadcrumbs';

const renderApp = (
  element: HTMLElement,
  history: ManagementAppMountParams['history'],
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  fieldFormats: FieldFormatsStart,
  charts: ChartsPluginStart,
  isServerless: boolean,
  mlFeatures: MlFeatures,
  spacesApi?: SpacesPluginStart,
  usageCollection?: UsageCollectionSetup
) => {
  ReactDOM.render(
    React.createElement(AnomalyDetectionJobsPage, {
      coreStart,
      history,
      share,
      data,
      charts,
      spacesApi,
      usageCollection,
      fieldFormats,
      isServerless,
      mlFeatures,
    }),
    element
  );
  return () => {
    unmountComponentAtNode(element);
  };
};

export async function mountApp(
  core: CoreSetup<MlStartDependencies>,
  params: ManagementAppMountParams,
  deps: { usageCollection?: UsageCollectionSetup },
  isServerless: boolean,
  mlFeatures: MlFeatures
) {
  const [coreStart, pluginsStart] = await core.getStartServices();

  params.setBreadcrumbs(getJobsListBreadcrumbs()); // TODO: update this
  return renderApp(
    params.element,
    params.history,
    coreStart,
    pluginsStart.share,
    pluginsStart.data,
    pluginsStart.fieldFormats,
    pluginsStart.charts,
    isServerless,
    mlFeatures,
    pluginsStart.spaces,
    deps.usageCollection
  );
}
