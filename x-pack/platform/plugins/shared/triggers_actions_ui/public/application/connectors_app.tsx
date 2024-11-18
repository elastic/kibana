/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { ChromeBreadcrumb, CoreStart, CoreTheme, ScopedHistory } from '@kbn/core/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { QueryClientProvider } from '@tanstack/react-query';

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../types';

import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { ConnectorProvider } from './context/connector_context';
import { Section } from './constants';
import { queryClient } from './query_client';

const ActionsConnectorsHome = lazy(
  () => import('./sections/actions_connectors_list/components/actions_connectors_home')
);

export interface TriggersAndActionsUiServices extends CoreStart {
  actions: ActionsPublicPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dashboard: DashboardStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  storage?: Storage;
  isCloud: boolean;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
  history: ScopedHistory;
  kibanaFeatures: KibanaFeature[];
  element: HTMLElement;
  theme$: Observable<CoreTheme>;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export const renderApp = (deps: TriggersAndActionsUiServices) => {
  const { element } = deps;
  render(<App deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const App = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { dataViews } = deps;
  const sections: Section[] = ['connectors', 'logs'];
  const sectionsRegex = sections.join('|');

  setDataViewsService(dataViews);
  return (
    <KibanaRenderContextProvider {...deps}>
      <KibanaContextProvider services={{ ...deps }}>
        <Router history={deps.history}>
          <QueryClientProvider client={queryClient}>
            <AppWithoutRouter sectionsRegex={sectionsRegex} />
          </QueryClientProvider>
        </Router>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

export const AppWithoutRouter = ({ sectionsRegex }: { sectionsRegex: string }) => {
  const {
    actions: { validateEmailAddresses },
  } = useKibana().services;

  return (
    <ConnectorProvider value={{ services: { validateEmailAddresses } }}>
      <Routes>
        <Route
          path={`/:section(${sectionsRegex})`}
          component={suspendedComponentWithProps(ActionsConnectorsHome, 'xl')}
        />

        <Redirect from={'/'} to="connectors" />
      </Routes>
    </ConnectorProvider>
  );
};
