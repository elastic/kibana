/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { I18nContext } from 'ui/i18n';
import { Route, Switch, HashRouter } from 'react-router-dom';

import { NoDataView } from './views/';

export const App: React.FC = () => {
  return (
    <I18nContext>
      <HashRouter>
        <Switch>
          <Route exact path={`/no-data`} component={NoDataView} />
        </Switch>
      </HashRouter>
    </I18nContext>
  );
};
