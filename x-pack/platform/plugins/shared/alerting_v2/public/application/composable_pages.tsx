/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Container } from 'inversify';
import type { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import { Context } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { RulesApp } from './rules_app';
import { RuleLibraryApp } from './rule_library_app';
import { ActionPoliciesApp } from './action_policies_app';
import { EpisodesApp } from './episodes_app';
import { ExecutionHistoryApp } from './execution_history_app';
import { BreadcrumbProvider } from './breadcrumb_context';
import type { AlertEpisodesKibanaServices } from '../episodes_kibana_services';

export interface AlertingV2PageProps {
  coreStart: CoreStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

/** Internal props — includes the DI container injected by the lazy wrapper. */
export interface InternalPageProps extends AlertingV2PageProps {
  container: Container;
}

const StandardProviders = ({
  container,
  setBreadcrumbs,
  children,
}: {
  container: Container;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  children: React.ReactNode;
}) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <Context.Provider value={container}>
      <QueryClientProvider client={queryClient}>
        <BreadcrumbProvider setBreadcrumbs={setBreadcrumbs}>
          <I18nProvider>{children}</I18nProvider>
        </BreadcrumbProvider>
      </QueryClientProvider>
    </Context.Provider>
  );
};

export const AlertingV2RulesPage = ({ container, setBreadcrumbs }: InternalPageProps) => (
  <StandardProviders container={container} setBreadcrumbs={setBreadcrumbs}>
    <RulesApp />
  </StandardProviders>
);

export const AlertingV2RuleLibraryPage = ({ container, setBreadcrumbs }: InternalPageProps) => (
  <StandardProviders container={container} setBreadcrumbs={setBreadcrumbs}>
    <RuleLibraryApp />
  </StandardProviders>
);

export const AlertingV2ActionPoliciesPage = ({ container, setBreadcrumbs }: InternalPageProps) => (
  <StandardProviders container={container} setBreadcrumbs={setBreadcrumbs}>
    <ActionPoliciesApp />
  </StandardProviders>
);

export const AlertingV2ExecutionHistoryPage = ({
  container,
  setBreadcrumbs,
}: InternalPageProps) => (
  <StandardProviders container={container} setBreadcrumbs={setBreadcrumbs}>
    <ExecutionHistoryApp />
  </StandardProviders>
);

const episodesStorage = new Storage(localStorage);

export const AlertingV2EpisodesPage = ({
  coreStart,
  container,
  setBreadcrumbs,
}: InternalPageProps) => {
  const [queryClient] = useState(() => new QueryClient());

  const kibanaReactServices: AlertEpisodesKibanaServices = useMemo(
    () => ({
      ...coreStart,
      share: container.get(PluginStart('share')) as SharePluginStart,
      data: container.get(PluginStart('data')) as DataPublicPluginStart,
      dataViews: container.get(PluginStart('dataViews')) as DataViewsPublicPluginStart,
      expressions: container.get(PluginStart('expressions')) as ExpressionsStart,
      uiActions: container.get(PluginStart('uiActions')) as UiActionsStart,
      fieldFormats: container.get(PluginStart('fieldFormats')) as FieldFormatsStart,
      lens: container.get(PluginStart('lens')) as LensPublicStart,
      charts: container.get(PluginStart('charts')) as ChartsPluginStart,
      storage: episodesStorage,
      toastNotifications: coreStart.notifications.toasts,
      unifiedDocViewer: container.get(PluginStart('unifiedDocViewer')) as UnifiedDocViewerStart,
      spaces: container.get(PluginStart('spaces')) as SpacesPluginStart,
    }),
    [coreStart, container]
  );

  return (
    <KibanaContextProvider services={kibanaReactServices}>
      <Context.Provider value={container}>
        <QueryClientProvider client={queryClient}>
          <BreadcrumbProvider setBreadcrumbs={setBreadcrumbs}>
            <I18nProvider>
              <EpisodesApp />
            </I18nProvider>
          </BreadcrumbProvider>
        </QueryClientProvider>
      </Context.Provider>
    </KibanaContextProvider>
  );
};
