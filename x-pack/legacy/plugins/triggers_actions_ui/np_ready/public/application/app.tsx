/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route, Redirect, HashRouter } from 'react-router-dom';
import {
  ChromeStart,
  DocLinksStart,
  ToastsSetup,
  HttpSetup,
  IUiSettingsClient,
} from 'kibana/public';
import { BASE_PATH, Section } from './constants';
import { TriggersActionsUIHome } from './home';
import { AppContextProvider, useAppDependencies } from './app_context';
import { hasShowAlertsCapability } from './lib/capabilities';
import { ActionTypeRegistry } from './action_type_registry';
import { AlertTypeRegistry } from './alert_type_registry';
import { LegacyDependencies } from '../types';

export interface AppDeps {
  chrome: ChromeStart;
  docLinks: DocLinksStart;
  toastNotifications: ToastsSetup;
  injectedMetadata: any;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  legacy: LegacyDependencies;
  actionTypeRegistry: ActionTypeRegistry;
  alertTypeRegistry: AlertTypeRegistry;
}

class ShareRouter extends Component {
  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.shape({
        push: PropTypes.func.isRequired,
        createHref: PropTypes.func.isRequired,
      }).isRequired,
    }).isRequired,
  };

  render() {
    return this.props.children;
  }
}

export const App = (deps: AppDeps) => {
  const sections: Section[] = ['alerts', 'connectors'];

  const sectionsRegex = sections.join('|');

  return (
    <HashRouter>
      <ShareRouter>
        <AppContextProvider value={deps}>
          <AppWithoutRouter sectionsRegex={sectionsRegex} />
        </AppContextProvider>
      </ShareRouter>
    </HashRouter>
  );
};

export const AppWithoutRouter = ({ sectionsRegex }: any) => {
  const {
    legacy: { capabilities },
  } = useAppDependencies();
  const canShowAlerts = hasShowAlertsCapability(capabilities.get());
  const DEFAULT_SECTION: Section = canShowAlerts ? 'alerts' : 'connectors';
  return (
    <Switch>
      <Route
        exact
        path={`${BASE_PATH}/:section(${sectionsRegex})`}
        component={TriggersActionsUIHome}
      />
      <Redirect from={`${BASE_PATH}`} to={`${BASE_PATH}/${DEFAULT_SECTION}`} />
    </Switch>
  );
};
