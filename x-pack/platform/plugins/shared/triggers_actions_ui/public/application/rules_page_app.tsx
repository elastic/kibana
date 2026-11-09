/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useMemo } from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { render, unmountComponentAtNode } from 'react-dom';
import { QueryClientProvider } from '@kbn/react-query';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import {
  rulesAppDetailsRoute,
  createRuleRoute,
  createRuleFromTemplateRoute,
  ruleLogsRoute,
  editRuleRoute,
  STACK_MANAGEMENT_RULES_HOST,
} from '@kbn/rule-data-utils';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { ConnectorProvider } from './context/connector_context';
import { queryClient } from './query_client';
import type { TriggersAndActionsUiServices } from './rules_app';
import { LocatorProvider } from './locator_context';
import { getLocators } from '../locators/bind_locator_to_host';

const RuleDetailsRouteWrapper = lazy(
  () => import('./sections/rule_details/components/rule_details_route_wrapper')
);
const RulesPage = lazy(() => import('./sections/rules_page/rules_page_container'));
const RuleFormRoute = lazy(() => import('./sections/rule_form/rule_form_route'));

/*
 * Route components are module-scoped so their identity is stable across renders; a new
 * component type on <Route component> unmounts and remounts the whole matched page.
 */
const SuspendedCreateRuleFromTemplateRoute = suspendedComponentWithProps(RuleFormRoute, 'xl');
const SuspendedCreateRuleRoute = suspendedComponentWithProps(RuleFormRoute, 'xl');
const SuspendedEditRuleRoute = suspendedComponentWithProps(RuleFormRoute, 'xl');
const SuspendedRuleLogsRoute = suspendedComponentWithProps(RulesPage, 'xl');
const SuspendedRuleDetailsRoute = suspendedComponentWithProps(RuleDetailsRouteWrapper, 'xl');
const SuspendedRulesListRoute = suspendedComponentWithProps(RulesPage, 'xl');

export const renderRulesPageApp = (deps: TriggersAndActionsUiServices) => {
  const { element } = deps;
  render(<RulesPageApp deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const RulesPageApp = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { dataViews, share, host } = deps;
  setDataViewsService(dataViews);
  const locators = useMemo(() => {
    if (!share) {
      throw new Error('share plugin is required to bind classic rules locators');
    }
    return getLocators(share, host ?? STACK_MANAGEMENT_RULES_HOST);
  }, [share, host]);
  return deps.rendering.addContext(
    <KibanaContextProvider services={{ ...deps }}>
      <LocatorProvider locators={locators}>
        <Router history={deps.history}>
          <QueryClientProvider client={queryClient}>
            <AppWithoutRouter />
          </QueryClientProvider>
        </Router>
      </LocatorProvider>
    </KibanaContextProvider>
  );
};

const AppWithoutRouter = () => {
  const {
    actions: { validateEmailAddresses, enabledEmailServices, isInboundEventsEnabled },
    isServerless,
  } = useKibana().services;

  return (
    <ConnectorProvider
      value={{
        services: { validateEmailAddresses, enabledEmailServices, isInboundEventsEnabled },
        isServerless,
      }}
    >
      <PerformanceContextProvider>
        <Routes>
          <Route
            exact
            path={createRuleFromTemplateRoute}
            component={SuspendedCreateRuleFromTemplateRoute}
          />
          <Route exact path={createRuleRoute} component={SuspendedCreateRuleRoute} />
          <Route exact path={editRuleRoute} component={SuspendedEditRuleRoute} />
          <Route exact path={ruleLogsRoute} component={SuspendedRuleLogsRoute} />
          <Route path={rulesAppDetailsRoute} component={SuspendedRuleDetailsRoute} />
          <Route path="/" component={SuspendedRulesListRoute} />
        </Routes>
      </PerformanceContextProvider>
    </ConnectorProvider>
  );
};
