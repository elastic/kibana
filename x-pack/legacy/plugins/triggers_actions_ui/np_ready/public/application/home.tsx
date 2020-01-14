/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';

import { BASE_PATH, Section, routeToConnectors, routeToAlerts } from './constants';
import { getCurrentBreadcrumb } from './lib/breadcrumb';
import { getCurrentDocTitle } from './lib/doc_title';
import { useAppDependencies } from './app_context';
import { hasShowActionsCapability, hasShowAlertsCapability } from './lib/capabilities';

import { ActionsConnectorsList } from './sections/actions_connectors_list/components/actions_connectors_list';
import { AlertsList } from './sections/alerts_list/components/alerts_list';

interface MatchParams {
  section: Section;
}

export const TriggersActionsUIHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const {
    chrome,
    legacy: { MANAGEMENT_BREADCRUMB, capabilities },
  } = useAppDependencies();

  const canShowActions = hasShowActionsCapability(capabilities.get());
  const canShowAlerts = hasShowAlertsCapability(capabilities.get());
  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [];

  if (canShowAlerts) {
    tabs.push({
      id: 'alerts',
      name: (
        <FormattedMessage
          id="xpack.triggersActionsUI.home.alertsTabTitle"
          defaultMessage="Alerts"
        />
      ),
    });
  }

  if (canShowActions) {
    tabs.push({
      id: 'connectors',
      name: (
        <FormattedMessage
          id="xpack.triggersActionsUI.home.connectorsTabTitle"
          defaultMessage="Connectors"
        />
      ),
    });
  }

  const onSectionChange = (newSection: Section) => {
    history.push(`${BASE_PATH}/${newSection}`);
  };

  // Set breadcrumb and page title
  useEffect(() => {
    chrome.setBreadcrumbs([MANAGEMENT_BREADCRUMB, getCurrentBreadcrumb(section || 'home')]);
    chrome.docTitle.change(getCurrentDocTitle(section || 'home'));
  }, [section, chrome, MANAGEMENT_BREADCRUMB]);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle size="m">
              <h1 data-test-subj="appTitle">
                <FormattedMessage
                  id="xpack.triggersActionsUI.home.appTitle"
                  defaultMessage="Alerts and Actions"
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>

        <EuiTabs>
          {tabs.map(tab => (
            <EuiTab
              onClick={() => onSectionChange(tab.id)}
              isSelected={tab.id === section}
              key={tab.id}
              data-test-subj={`${tab.id}Tab`}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="s" />

        <Switch>
          {canShowActions && (
            <Route exact path={routeToConnectors} component={ActionsConnectorsList} />
          )}
          {canShowAlerts && <Route exact path={routeToAlerts} component={AlertsList} />}
        </Switch>
      </EuiPageContent>
    </EuiPageBody>
  );
};
