/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import type { AppMountParameters, CoreSetup } from '@kbn/core/public';
import { DATA_CONNECTORS_ROUTE } from '../common';
import { DATA_CONNECTORS_APP_ID, DATA_CONNECTORS_FULL_TITLE } from '../common/constants';
import type { DataConnectorsPluginStart, DataConnectorsPluginStartDependencies } from './types';

export const registerApp = ({
  core,
}: {
  core: CoreSetup<DataConnectorsPluginStartDependencies, DataConnectorsPluginStart>;
}) => {
  core.application.register({
    id: DATA_CONNECTORS_APP_ID,
    title: DATA_CONNECTORS_FULL_TITLE,
    category: DEFAULT_APP_CATEGORIES.workplaceAI,
    appRoute: DATA_CONNECTORS_ROUTE,
    euiIconType: 'logoElasticsearch', // TODO: Workplace AI solution icon
    visibleIn: ['sideNav', 'globalSearch'],
    mount: async (params: AppMountParameters) => {
      const { renderApp } = await import('./application');
      const [coreStart, pluginsStart, services] = await core.getStartServices();
      return renderApp({ core: coreStart, plugins: pluginsStart, services, params });
    },
  });
};
