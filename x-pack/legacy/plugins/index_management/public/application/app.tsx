/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';
import { BASE_PATH, UIM_APP_LOAD } from '../../common/constants';
import { IndexManagementHome } from './sections/home';
import { TemplateCreate } from './sections/template_create';
import { TemplateClone } from './sections/template_clone';
import { TemplateEdit } from './sections/template_edit';

import { useServices } from './app_context';

export const App = () => {
  const { uiMetricService } = useServices();
  useEffect(() => uiMetricService.trackMetric('loaded', UIM_APP_LOAD), []);

  return (
    <HashRouter>
      <AppWithoutRouter />
    </HashRouter>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Switch>
    <Route exact path={`${BASE_PATH}create_template`} component={TemplateCreate} />
    <Route exact path={`${BASE_PATH}clone_template/:name*`} component={TemplateClone} />
    <Route exact path={`${BASE_PATH}edit_template/:name*`} component={TemplateEdit} />
    <Route path={`${BASE_PATH}:section(indices|templates)`} component={IndexManagementHome} />
    <Redirect from={`${BASE_PATH}`} to={`${BASE_PATH}indices`} />
  </Switch>
);
