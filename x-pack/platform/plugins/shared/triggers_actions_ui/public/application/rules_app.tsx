/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type {
  ChromeBreadcrumb,
  CoreStart,
  I18nStart,
  ScopedHistory,
  ThemeServiceStart,
} from '@kbn/core/public';
import { render, unmountComponentAtNode } from 'react-dom';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import {
  ruleDetailsRoute,
  createRuleRoute,
  editRuleRoute,
  createRuleFromTemplateRoute,
} from '@kbn/rule-data-utils';
import { QueryClientProvider } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../types';
import type { Section } from './constants';
import { legacyRouteToRuleDetails, routeToConnectors, legacyRouteToAlerts } from './constants';

import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { ConnectorProvider } from './context/connector_context';
import { ALERTS_PAGE_ID, CONNECTORS_PLUGIN_ID } from '../common/constants';
import { queryClient } from './query_client';

const TriggersActionsUIHome = lazy(() => import('./home'));
const RuleDetailsRoute = lazy(
  () => import('./sections/rule_details/components/rule_details_route')
);
const RuleFormRoute = lazy(() => import('./sections/rule_form/rule_form_route'));

export interface TriggersAndActionsUiServices extends CoreStart {
  actions: ActionsPublicPluginSetup;
  cloud?: CloudSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
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
  fieldsMetadata: FieldsMetadataPublicStart;
  share?: SharePluginStart;
  contentManagement?: ContentManagementPublicStart;
  uiActions?: UiActionsStart;
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
  return deps.rendering.addContext(
    <KibanaContextProvider services={{ ...deps }}>
      <Router history={deps.history}>
        <QueryClientProvider client={queryClient}>
          <AppWithoutRouter sectionsRegex={sectionsRegex} />
        </QueryClientProvider>
      </Router>
    </KibanaContextProvider>
  );
};

export const AppWithoutRouter = ({ sectionsRegex }: { sectionsRegex: string }) => {
  const {
    actions: { validateEmailAddresses, enabledEmailServices },
    application: { navigateToApp },
    isServerless,
  } = useKibana().services;

  return (
    <ConnectorProvider
      value={{ services: { validateEmailAddresses, enabledEmailServices }, isServerless }}
    >
      <Routes>
        <Route
          exact
          path={createRuleFromTemplateRoute}
          component={suspendedComponentWithProps(RuleFormRoute, 'xl')}
        />
        <Route
          exact
          path={createRuleRoute}
          component={suspendedComponentWithProps(RuleFormRoute, 'xl')}
        />
        <Route
          exact
          path={editRuleRoute}
          component={suspendedComponentWithProps(RuleFormRoute, 'xl')}
        />
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
