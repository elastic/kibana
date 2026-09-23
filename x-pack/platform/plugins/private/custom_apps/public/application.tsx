/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CustomAppClient } from './app/custom_app_client';
import { CustomAppPage } from './app/custom_app_page';
import { ListingPage } from './app/listing_page';

function appIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/\/app\/([^/?#]+)/);
  return match?.[1];
}

function CustomAppsRouter({
  core,
  data,
  history,
}: {
  core: CoreStart;
  data: DataPublicPluginStart;
  history: AppMountParameters['history'];
}) {
  const [client] = useState(() => new CustomAppClient(core.http));
  const [appId, setAppId] = useState<string | undefined>(() =>
    appIdFromPath(history.location.pathname)
  );

  const openApp = (id: string) => {
    history.push(`/app/${id}`);
    setAppId(id);
  };

  const openList = () => {
    history.push('/');
    setAppId(undefined);
  };

  return appId ? (
    <CustomAppPage
      core={core}
      data={data}
      client={client}
      appId={appId}
      onNavigateToList={openList}
    />
  ) : (
    <ListingPage core={core} client={client} onOpen={openApp} />
  );
}

export function renderApp(
  core: CoreStart,
  data: DataPublicPluginStart,
  { element, history }: AppMountParameters
) {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <CustomAppsRouter core={core} data={data} history={history} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
