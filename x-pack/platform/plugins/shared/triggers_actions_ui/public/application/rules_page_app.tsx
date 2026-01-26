/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { render, unmountComponentAtNode } from 'react-dom';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import {
  rulesAppDetailsRoute,
  createRuleRoute,
  createRuleFromTemplateRoute,
  ruleLogsRoute,
  editRuleRoute,
} from '@kbn/rule-data-utils';
import { ResponseOpsQueryClientProvider } from '@kbn/response-ops-react-query/providers/response_ops_query_client_provider';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { ConnectorProvider } from './context/connector_context';
import type { TriggersAndActionsUiServices } from './rules_app';

const RuleDetailsRouteWrapper = lazy(
  () => import('./sections/rule_details/components/rule_details_route_wrapper')
);
const RulesPage = lazy(() => import('./sections/rules_page/rules_page'));
const RuleFormRoute = lazy(() => import('./sections/rule_form/rule_form_route'));

export const renderRulesPageApp = (deps: TriggersAndActionsUiServices) => {
  const { element } = deps;
  render(<RulesPageApp deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const RulesPageApp = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { dataViews } = deps;
  setDataViewsService(dataViews);
  return deps.rendering.addContext(
    <KibanaContextProvider services={{ ...deps }}>
      <Router history={deps.history}>
        <ResponseOpsQueryClientProvider>
          <AppWithoutRouter />
        </ResponseOpsQueryClientProvider>
      </Router>
    </KibanaContextProvider>
  );
};

const AppWithoutRouter = () => {
  const {
    actions: { validateEmailAddresses, enabledEmailServices },
    isServerless,
  } = useKibana().services;

  return (
    <ConnectorProvider
      value={{ services: { validateEmailAddresses, enabledEmailServices }, isServerless }}
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
