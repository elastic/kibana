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
import type { MlFeatures } from '../../../../common/constants/app';
import type { MlStartDependencies } from '../../../plugin';
import { JobsListPage } from './components';
import { getJobsListBreadcrumbs } from '../breadcrumbs';

const renderApp = (
  element: HTMLElement,
  history: ManagementAppMountParams['history'],
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  fieldFormats: FieldFormatsStart,
  isServerless: boolean,
  mlFeatures: MlFeatures,
  spaces?: SpacesPluginStart,
  usageCollection?: UsageCollectionSetup
) => {
  ReactDOM.render(
    React.createElement(JobsListPage, {
      coreStart,
      history,
      share,
      data,
      spaces,
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

  params.setBreadcrumbs(getJobsListBreadcrumbs());
  return renderApp(
    params.element,
    params.history,
    coreStart,
    pluginsStart.share,
    pluginsStart.data,
    pluginsStart.fieldFormats,
    isServerless,
    mlFeatures,
    pluginsStart.spaces,
    deps.usageCollection
  );
}
