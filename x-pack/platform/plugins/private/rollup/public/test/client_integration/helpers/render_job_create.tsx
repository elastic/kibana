/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { Provider } from 'react-redux';
import { Route, Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';

import { registerRouter } from '../../../crud_app/services';
import { createRollupJobsStore } from '../../../crud_app/store';
import { JobCreate } from '../../../crud_app/sections';
import { wrapComponent } from './setup_context';

export const renderJobCreate = ({ initialEntries = ['/create'] } = {}) => {
  const store = createRollupJobsStore();
  const history = createMemoryHistory({ initialEntries });
  registerRouter({ history });
  const WrappedJobCreate = wrapComponent(JobCreate);

  renderWithI18n(
    <Provider store={store}>
      <Router history={history}>
        <Route path="/create" component={WrappedJobCreate} />
      </Router>
    </Provider>
  );
};
