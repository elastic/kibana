/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route, Redirect } from 'react-router-dom';
import { BASE_PATH, Section } from './constants';
import { TriggersActionsUIHome } from './home';
import { useAppDependencies } from './app_dependencies';
import { hasShowAlertsCapability } from './lib/capabilities';

class ShareRouter extends Component {
  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.shape({
        push: PropTypes.func.isRequired,
        createHref: PropTypes.func.isRequired,
      }).isRequired,
    }).isRequired,
  };
  constructor(props: any, context?: any) {
    super(props, context);
  }

  render() {
    return this.props.children;
  }
}

export const App = () => {
  const sections: Section[] = ['alerts', 'connectors'];

  const sectionsRegex = sections.join('|');

  return (
    <ShareRouter>
      <AppWithoutRouter sectionsRegex={sectionsRegex} />
    </ShareRouter>
  );
};

export const AppWithoutRouter = ({ sectionsRegex }: any) => {
  const {
    plugins: { capabilities },
  } = useAppDependencies();
  const canShowAlerts = hasShowAlertsCapability(capabilities.get());
  const DEFAULT_SECTION = canShowAlerts ? 'alerts' : 'connectors';
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
