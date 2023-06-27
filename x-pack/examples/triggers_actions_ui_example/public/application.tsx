/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route } from '@kbn/shared-ux-router';
import { EuiPage, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TriggersActionsUiExamplePublicStartDeps } from './plugin';

import { Page } from './components/page';
import { Sidebar } from './components/sidebar';

import { RulesListSandbox } from './components/rules_list_sandbox';
import { RulesListNotifyBadgeSandbox } from './components/rules_list_notify_badge_sandbox';
import { RuleTagBadgeSandbox } from './components/rule_tag_badge_sandbox';
import { RuleTagFilterSandbox } from './components/rule_tag_filter_sandbox';
import { RuleEventLogListSandbox } from './components/rule_event_log_list_sandbox';
import { RuleStatusDropdownSandbox } from './components/rule_status_dropdown_sandbox';
import { RuleStatusFilterSandbox } from './components/rule_status_filter_sandbox';
import { AlertsTableSandbox } from './components/alerts_table_sandbox';
import { RulesSettingsLinkSandbox } from './components/rules_settings_link_sandbox';

export interface TriggersActionsUiExampleComponentParams {
  http: CoreStart['http'];
  basename: string;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
}

const TriggersActionsUiExampleApp = ({
  basename,
  triggersActionsUi,
}: TriggersActionsUiExampleComponentParams) => {
  return (
    <Router basename={basename}>
      <EuiPage>
        <Sidebar />
        <Route exact path="/">
          <Page title="Home" isHome>
            <EuiTitle size="l">
              <h1>Welcome to the Triggers Actions UI plugin example</h1>
            </EuiTitle>
            <EuiSpacer />
            <EuiText>
              This example plugin displays the shareable components in the Triggers Actions UI
              plugin. It also serves as a sandbox to run functional tests to ensure the shareable
              components are functioning correctly outside of their original plugin.
            </EuiText>
          </Page>
        </Route>
        <Route path="/rules_list">
          <Page title="Rules List">
            <RulesListSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path="/rules_list_notify_badge">
          <Page title="Rule List Notify Badge">
            <RulesListNotifyBadgeSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path="/rule_tag_badge">
          <Page title="Rule Tag Badge">
            <RuleTagBadgeSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path="/rule_tag_filter">
          <Page title="Rule Tag Filter">
            <RuleTagFilterSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path="/rule_event_log_list">
          <Page title="Run History List">
            <RuleEventLogListSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path="/rule_status_dropdown">
          <Page title="Rule Status Dropdown">
            <RuleStatusDropdownSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path="/rule_status_filter">
          <Page title="Rule Status Filter">
            <RuleStatusFilterSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path="/alerts_table">
          <Page title="Alerts Table">
            <AlertsTableSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path="/rules_settings_link">
          <Page title="Rules Settings Link">
            <RulesSettingsLinkSandbox triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
      </EuiPage>
    </Router>
  );
};

export const renderApp = (
  core: CoreStart,
  deps: TriggersActionsUiExamplePublicStartDeps,
  { appBasePath, element }: AppMountParameters
) => {
  const { http } = core;
  const { triggersActionsUi } = deps;
  const { ruleTypeRegistry, actionTypeRegistry } = triggersActionsUi;
  ReactDOM.render(
    <KibanaContextProvider
      services={{
        ...core,
        ...deps,
        ruleTypeRegistry,
        actionTypeRegistry,
      }}
    >
      <IntlProvider locale="en">
        <TriggersActionsUiExampleApp
          basename={appBasePath}
          http={http}
          triggersActionsUi={deps.triggersActionsUi}
          data={deps.data}
        />
      </IntlProvider>
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
