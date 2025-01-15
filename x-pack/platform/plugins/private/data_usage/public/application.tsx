/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { useKibanaContextForPluginProvider } from './utils/use_kibana';
import { DataUsageStartDependencies, DataUsagePublicStart } from './types';
import { PLUGIN_ID } from '../common';
import { DataUsageReactQueryClientProvider } from '../common/query_client';
import { DataUsageMetricsPage } from './app/data_usage_metrics_page';

export const renderApp = (
  core: CoreStart,
  plugins: DataUsageStartDependencies,
  pluginStart: DataUsagePublicStart,
  params: ManagementAppMountParams
) => {
  ReactDOM.render(
    <App params={params} core={core} plugins={plugins} pluginStart={pluginStart} />,
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};

const AppWithExecutionContext = ({
  core,
  params,
}: {
  core: CoreStart;
  params: ManagementAppMountParams;
}) => {
  const { executionContext } = core;

  useExecutionContext(executionContext, {
    type: 'application',
    page: PLUGIN_ID,
  });

  return (
    <Router history={params.history}>
      <PerformanceContextProvider>
        <Routes>
          <Route path="/" exact={true} component={DataUsageMetricsPage} />
        </Routes>
      </PerformanceContextProvider>
    </Router>
  );
};

interface AppProps {
  core: CoreStart;
  plugins: DataUsageStartDependencies;
  pluginStart: DataUsagePublicStart;
  params: ManagementAppMountParams;
}

const App = ({ core, plugins, pluginStart, params }: AppProps) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart,
    params
  );

  return (
    <KibanaRenderContextProvider {...core} {...params}>
      <KibanaContextProviderForPlugin>
        <DataUsageReactQueryClientProvider>
          <AppWithExecutionContext core={core} params={params} />
        </DataUsageReactQueryClientProvider>
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
