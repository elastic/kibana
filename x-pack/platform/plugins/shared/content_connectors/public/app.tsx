/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { getContext, resetContext } from 'kea';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import { Route, Routes, Router } from '@kbn/shared-ux-router';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { ConnectorDefinition } from '@kbn/search-connectors';
import { CONNECTORS_PATH, ROOT_PATH } from './components/routes';
import { ConnectorsRouter } from './components/connectors/connectors_router';
import { SearchConnectorsPluginStart, SearchConnectorsPluginStartDependencies } from './types';
import { useKibanaContextForPluginProvider } from './utils/use_kibana';
import { AppContextProvider } from './app_context';
import { PLUGIN_ID } from '../common/constants';
import { mountFlashMessagesLogic } from './components/shared/flash_messages';

export const renderApp = (
  core: CoreStart,
  plugins: SearchConnectorsPluginStartDependencies,
  pluginStart: SearchConnectorsPluginStart,
  params: ManagementAppMountParams,
  connectorTypes: ConnectorDefinition[],
  kibanaVersion: string
) => {
  resetContext({
    createStore: true,
  });
  const store = getContext().store;
  const unmountFlashMessagesLogic = mountFlashMessagesLogic({
    notifications: core.notifications,
    history: params.history,
  });
  ReactDOM.render(
    <App
      params={params}
      core={core}
      plugins={plugins}
      pluginStart={pluginStart}
      connectorTypes={connectorTypes}
      store={store}
      kibanaVersion={kibanaVersion}
    />,
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
    unmountFlashMessagesLogic();
  };
};

export const SearchConnectorsAppConfigured = () => {
  return (
    <Routes>
      <Redirect exact from={ROOT_PATH} to={CONNECTORS_PATH} />
      <Route path={CONNECTORS_PATH}>
        <ConnectorsRouter />
      </Route>
    </Routes>
  );
};

const AppWithExecutionContext = ({
  core,
  plugins,
  connectorTypes,
  params,
  store,
  kibanaVersion,
}: {
  core: CoreStart;
  plugins: SearchConnectorsPluginStartDependencies;
  params: ManagementAppMountParams;
  connectorTypes: ConnectorDefinition[];
  store: Store;
  kibanaVersion: string;
}) => {
  const { executionContext } = core;

  useExecutionContext(executionContext, {
    type: 'application',
    page: PLUGIN_ID,
  });

  const isServerless = !!plugins.cloud?.isServerlessEnabled;
  const isCloud = !!plugins.cloud?.isCloudEnabled;

  const isAgentlessEnabled =
    (isCloud || isServerless) && plugins.fleet?.config.agentless?.enabled === true;

  const indexMappingComponent = plugins.indexManagement?.getIndexMappingComponent({
    history: params.history,
  });

  const appContext = {
    connectorTypes,
    isCloud,
    hasPlatinumLicense: true,
    plugins,
    isAgentlessEnabled,
    kibanaVersion,
    indexMappingComponent,
  };
  return (
    <Router history={params.history}>
      <AppContextProvider value={appContext}>
        <Provider store={store}>
          <SearchConnectorsAppConfigured />
        </Provider>
      </AppContextProvider>
    </Router>
  );
};

interface AppProps {
  core: CoreStart;
  plugins: SearchConnectorsPluginStartDependencies;
  pluginStart: SearchConnectorsPluginStart;
  params: ManagementAppMountParams;
  connectorTypes: ConnectorDefinition[];
  store: Store;
  kibanaVersion: string;
}

const App = ({
  core,
  plugins,
  pluginStart,
  params,
  connectorTypes,
  store,
  kibanaVersion,
}: AppProps) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart,
    params
  );

  return (
    <KibanaRenderContextProvider {...core} {...params}>
      <KibanaContextProviderForPlugin>
        <AppWithExecutionContext
          core={core}
          params={params}
          connectorTypes={connectorTypes}
          plugins={plugins}
          store={store}
          kibanaVersion={kibanaVersion}
        />
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
