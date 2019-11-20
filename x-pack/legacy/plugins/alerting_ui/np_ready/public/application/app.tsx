/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Switch, Route, Redirect } from 'react-router-dom';
import { BASE_PATH, Section, DEFAULT_SECTION } from './constants';
import { AlertsUIHome } from './home';

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

export const AppWithoutRouter = ({ sectionsRegex }: any) => (
  <Switch>
    <Route exact path={`${BASE_PATH}/:section(${sectionsRegex})`} component={AlertsUIHome} />
    <Redirect from={`${BASE_PATH}`} to={`${BASE_PATH}/${DEFAULT_SECTION}`} />
  </Switch>
);
