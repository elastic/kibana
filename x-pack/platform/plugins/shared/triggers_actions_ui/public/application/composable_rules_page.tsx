/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import type { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import { MemoryRouter } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { EuiPageSection } from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import {
  rulesAppDetailsRoute,
  createRuleRoute,
  createRuleFromTemplateRoute,
  ruleLogsRoute,
  editRuleRoute,
} from '@kbn/rule-data-utils';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../types';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { ConnectorProvider } from './context/connector_context';
import { queryClient } from './query_client';
import type { TriggersAndActionsUiServices } from './rules_app';

export interface ClassicRulesPageProps {
  coreStart: CoreStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  tabHrefOverrides?: { v1Href?: string; v2Href?: string };
}

export interface ClassicRulesPageInternalDeps {
  actions: ActionsPublicPluginSetup;
  security: SecurityPluginStart;
  cloud?: CloudSetup;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
  kibanaFeatures: KibanaFeature[];
  isCloud: boolean;
  isServerless: boolean;
  pluginsStart: Record<string, unknown>;
}

const RuleDetailsRouteWrapper = lazy(
  () => import('./sections/rule_details/components/rule_details_route_wrapper')
);
const RulesPage = lazy(() => import('./sections/rules_page/rules_page_container'));
const RuleFormRoute = lazy(() => import('./sections/rule_form/rule_form_route'));

const AppWithoutRouter = () => {
  const {
    actions: { validateEmailAddresses, enabledEmailServices },
    isServerless,
  } = useKibana().services;

  return (
    <ConnectorProvider
      value={{
        services: { validateEmailAddresses, enabledEmailServices },
        isServerless,
      }}
    >
      <PerformanceContextProvider>
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
            exact
            path={ruleLogsRoute}
            component={suspendedComponentWithProps(RulesPage, 'xl')}
          />
          <Route
            path={rulesAppDetailsRoute}
            component={suspendedComponentWithProps(RuleDetailsRouteWrapper, 'xl')}
          />
          <Route path="/" component={suspendedComponentWithProps(RulesPage, 'xl')} />
        </Routes>
      </PerformanceContextProvider>
    </ConnectorProvider>
  );
};

export const ComposableClassicRulesPage = ({
  coreStart,
  setBreadcrumbs,
  tabHrefOverrides,
  internalDeps,
}: ClassicRulesPageProps & { internalDeps: ClassicRulesPageInternalDeps }) => {
  const pluginsStart = internalDeps.pluginsStart as Record<string, any>;

  setDataViewsService(pluginsStart.dataViews);

  const deps: TriggersAndActionsUiServices = {
    ...coreStart,
    actions: internalDeps.actions,
    security: { ...coreStart.security, ...internalDeps.security },
    cloud: internalDeps.cloud,
    data: pluginsStart.data,
    dataViews: pluginsStart.dataViews,
    dataViewEditor: pluginsStart.dataViewEditor,
    charts: pluginsStart.charts,
    alerting: pluginsStart.alerting,
    spaces: pluginsStart.spaces,
    unifiedSearch: pluginsStart.unifiedSearch,
    isCloud: internalDeps.isCloud,
    element: document.createElement('div'),
    storage: new Storage(window.localStorage),
    setBreadcrumbs,
    history: { push: () => {}, replace: () => {}, listen: () => () => {} } as any,
    actionTypeRegistry: internalDeps.actionTypeRegistry,
    ruleTypeRegistry: internalDeps.ruleTypeRegistry,
    kibanaFeatures: internalDeps.kibanaFeatures,
    licensing: pluginsStart.licensing,
    expressions: pluginsStart.expressions,
    isServerless: internalDeps.isServerless,
    fieldFormats: pluginsStart.fieldFormats,
    lens: pluginsStart.lens,
    fieldsMetadata: pluginsStart.fieldsMetadata,
    contentManagement: pluginsStart.contentManagement,
    share: pluginsStart.share,
    uiActions: pluginsStart.uiActions,
    cps: pluginsStart.cps,
    inspector: pluginsStart.inspector,
    tabHrefOverrides,
  };

  return (
    <KibanaContextProvider services={{ ...deps }}>
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <EuiPageSection paddingSize="m">
            <AppWithoutRouter />
          </EuiPageSection>
        </QueryClientProvider>
      </MemoryRouter>
    </KibanaContextProvider>
  );
};
