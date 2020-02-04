/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Router } from 'react-router-dom';
import { MemoryHistory } from 'history/createMemoryHistory';
import { createMemoryHistory } from 'history';
import { mountWithIntl, renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

export const renderWithRouter = (Component: any, customHistory?: MemoryHistory) => {
  if (customHistory) {
    return renderWithIntl(<Router history={customHistory}>{Component}</Router>);
  }
  const history = createMemoryHistory();
  history.location.key = 'TestKeyForTesting';

  return renderWithIntl(<Router history={history}>{Component}</Router>);
};

export const shallowWithRouter = (Component: any, customHistory?: MemoryHistory) => {
  if (customHistory) {
    return shallowWithIntl(<Router history={customHistory}>{Component}</Router>);
  }
  const history = createMemoryHistory();
  history.location.key = 'TestKeyForTesting';

  return shallowWithIntl(<Router history={history}>{Component}</Router>);
};

export const mountWithRouter = (Component: any, customHistory?: MemoryHistory) => {
  if (customHistory) {
    customHistory.location.key = 'TestKeyForTesting';
    return mountWithIntl(<Router history={customHistory}>{Component}</Router>);
  }
  const history = createMemoryHistory();
  history.location.key = 'TestKeyForTesting';

  return mountWithIntl(<Router history={history}>{Component}</Router>);
};
