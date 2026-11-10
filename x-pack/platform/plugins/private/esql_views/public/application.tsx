/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CoreStart } from '@kbn/core/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { createEsqlViewsManagementClient } from '@kbn/esql-utils';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { ESQL_VIEWS_CAPABILITIES, PLUGIN_ID, PLUGIN_NAME } from '../common';
import { ManagementApp } from './management_app';
import type { StartDependencies } from './plugin';
import type { EsqlViewsTelemetryClient } from './telemetry';
import type { DiscoverEsqlLocatorParams } from './types';

const LazyEsqlEditor = React.lazy(async () => {
  const { ESQLLangEditor } = await import('@kbn/esql/public');
  return { default: ESQLLangEditor };
});

export const mountManagementSection = (
  coreStart: CoreStart,
  { data, share }: StartDependencies,
  { element, setBreadcrumbs }: ManagementAppMountParams,
  telemetryClient?: EsqlViewsTelemetryClient
) => {
  const { docTitle } = coreStart.chrome;
  docTitle.change(PLUGIN_NAME);
  setBreadcrumbs([{ text: PLUGIN_NAME }]);

  const client = createEsqlViewsManagementClient(coreStart.http);
  // Anything other than an explicit grant, including a stale or missing feature, hides the control.
  const capabilities = coreStart.application.capabilities[PLUGIN_ID];
  const isGranted = (capability: keyof typeof ESQL_VIEWS_CAPABILITIES) =>
    capabilities?.[ESQL_VIEWS_CAPABILITIES[capability]] === true;
  const discoverLocator = share.url.locators.get<DiscoverEsqlLocatorParams>(DISCOVER_APP_LOCATOR);
  const isDiscoverAvailable = Boolean(coreStart.application.capabilities.discover_v2?.show);
  const root = createRoot(element);
  root.render(
    coreStart.rendering.addContext(
      <ManagementApp
        canCreate={isGranted('create')}
        canEdit={isGranted('edit')}
        canDelete={isGranted('delete')}
        client={client}
        isDiscoverAvailable={isDiscoverAvailable}
        discoverLocator={discoverLocator}
        documentationUrl={coreStart.docLinks.links.query.queryESQLViews}
        EsqlEditor={LazyEsqlEditor}
        previewDependencies={{
          dataViews: data.dataViews,
          http: coreStart.http,
          search: data.search.search,
        }}
        telemetryClient={telemetryClient}
        toasts={coreStart.notifications.toasts}
      />
    )
  );

  return () => {
    docTitle.reset();
    root.unmount();
  };
};
