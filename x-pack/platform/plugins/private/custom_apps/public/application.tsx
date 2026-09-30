/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CustomAppClient } from './app/custom_app_client';
import { CustomAppPage } from './app/custom_app_page';
import { ListingPage } from './app/listing_page';

export function appIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/\/app\/([^/?#]+)/);
  return match?.[1];
}

/**
 * Editing is offered only to a reader who arrived through the listing page,
 * which is where apps are managed. The navigation link deliberately omits this,
 * so opening an app from the side nav is a read-only view.
 *
 * This is an affordance, not a permission: the marker is in the URL and anyone
 * can add it. What stops a reader without write access from saving is the saved
 * objects client, which the API routes delegate to.
 */
const FROM_LISTING = 'from=list';

export function canEditFrom(search: string): boolean {
  return new URLSearchParams(search).get('from') === 'list';
}

function CustomAppsRouter({
  core,
  data,
  history,
  onAppsChanged,
}: {
  core: CoreStart;
  data: DataPublicPluginStart;
  history: AppMountParameters['history'];
  onAppsChanged: () => void;
}) {
  const [client] = useState(() => new CustomAppClient(core.http));

  // Derived from the location rather than held separately, so the browser's back
  // and forward buttons move between the listing and an app.
  const [location, setLocation] = useState(history.location);
  useEffect(() => history.listen(setLocation), [history]);

  const appId = appIdFromPath(location.pathname);

  const openApp = (id: string) => history.push(`/app/${id}?${FROM_LISTING}`);
  const openList = () => history.push('/');

  return appId ? (
    <CustomAppPage
      core={core}
      data={data}
      client={client}
      appId={appId}
      canEdit={canEditFrom(location.search)}
      onNavigateToList={openList}
      onAppsChanged={onAppsChanged}
    />
  ) : (
    <ListingPage core={core} client={client} onOpen={openApp} onAppsChanged={onAppsChanged} />
  );
}

export function renderApp(
  core: CoreStart,
  data: DataPublicPluginStart,
  onAppsChanged: () => void,
  { element, history }: AppMountParameters
) {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <CustomAppsRouter core={core} data={data} history={history} onAppsChanged={onAppsChanged} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
