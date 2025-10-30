/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import type { AppMountParameters, CoreSetup } from '@kbn/core/public';
import { DATA_CONNECTORS_ROUTE } from '../common';
import type { DataConnectorsPluginStart, DataConnectorsPluginStartDependencies } from './types';
import { DATA_CONNECTORS_APP_ID, DATA_CONNECTORS_SHORT_TITLE } from '../common/constants';

export const registerApp = ({
  core,
}: {
  core: CoreSetup<DataConnectorsPluginStartDependencies, DataConnectorsPluginStart>;
}) => {
  core.application.register({
    id: DATA_CONNECTORS_APP_ID,
    title: DATA_CONNECTORS_SHORT_TITLE,
    category: DEFAULT_APP_CATEGORIES.workplaceAI,
    appRoute: DATA_CONNECTORS_ROUTE,
    visibleIn: ['sideNav', 'globalSearch'],
    mount: async (params: AppMountParameters) => {
      const { renderApp } = await import('./application');
      const [coreStart, pluginsStart, services] = await core.getStartServices();
      return renderApp({ core: coreStart, plugins: pluginsStart, services, params });
    },
  });
};
