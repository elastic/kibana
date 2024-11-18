/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import {
  ChromeBreadcrumb,
  CoreStart,
  I18nStart,
  ScopedHistory,
  ThemeServiceStart,
} from '@kbn/core/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { ruleDetailsRoute, createRuleRoute, editRuleRoute } from '@kbn/rule-data-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../types';
import {
  Section,
  legacyRouteToRuleDetails,
  routeToConnectors,
  legacyRouteToAlerts,
} from './constants';

import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { ConnectorProvider } from './context/connector_context';
import { ALERTS_PAGE_ID, CONNECTORS_PLUGIN_ID } from '../common/constants';
import { queryClient } from './query_client';
import { getIsExperimentalFeatureEnabled } from '../common/get_experimental_features';

const TriggersActionsUIHome = lazy(() => import('./home'));
const RuleDetailsRoute = lazy(
  () => import('./sections/rule_details/components/rule_details_route')
);
const CreateRuleRoute = lazy(() => import('./sections/rule_form/rule_form_route'));
const EditRuleRoute = lazy(() => import('./sections/rule_form/rule_form_route'));

export interface TriggersAndActionsUiServices extends CoreStart {
  actions: ActionsPublicPluginSetup;
  cloud?: CloudSetup;
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
  i18n: I18nStart;
  theme: ThemeServiceStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  licensing: LicensingPluginStart;
  expressions: ExpressionsStart;
  isServerless: boolean;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
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
  const sections: Section[] = ['rules', 'logs'];

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
    application: { navigateToApp },
  } = useKibana().services;

  const isUsingRuleCreateFlyout = getIsExperimentalFeatureEnabled('isUsingRuleCreateFlyout');

  return (
    <ConnectorProvider value={{ services: { validateEmailAddresses } }}>
      <Routes>
        {!isUsingRuleCreateFlyout && (
          <Route
            exact
            path={createRuleRoute}
            component={suspendedComponentWithProps(CreateRuleRoute, 'xl')}
          />
        )}
        {!isUsingRuleCreateFlyout && (
          <Route
            exact
            path={editRuleRoute}
            component={suspendedComponentWithProps(EditRuleRoute, 'xl')}
          />
        )}
        <Route
          path={`/:section(${sectionsRegex})`}
          component={suspendedComponentWithProps(TriggersActionsUIHome, 'xl')}
        />
        <Route
          path={ruleDetailsRoute}
          component={suspendedComponentWithProps(RuleDetailsRoute, 'xl')}
        />
        <Route
          exact
          path={legacyRouteToAlerts}
          render={() => {
            navigateToApp(`management/insightsAndAlerting/${ALERTS_PAGE_ID}`);
            return null;
          }}
        />
        <Route
          exact
          path={legacyRouteToRuleDetails}
          render={({ match }) => <Redirect to={`/rule/${match.params.alertId}`} />}
        />
        <Route
          exact
          path={routeToConnectors}
          render={() => {
            navigateToApp(`management/insightsAndAlerting/${CONNECTORS_PLUGIN_ID}`);
            return null;
          }}
        />
        <Redirect from={'/'} to="rules" />
      </Routes>
    </ConnectorProvider>
  );
};
