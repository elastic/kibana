/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Router } from 'react-router-dom';
import { MemoryHistory } from 'history/createMemoryHistory';
import { createMemoryHistory } from 'history';

export const renderWithRouter = (Component: any, customHistory?: MemoryHistory) => {
  if (customHistory) {
    return <Router history={customHistory}>{Component}</Router>;
  }
  const history = createMemoryHistory();
  history.location.key = 'TestKeyForTesting';

  return <Router history={history}>{Component}</Router>;
};
