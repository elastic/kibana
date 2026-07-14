/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { Router } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { ContextLandingPage } from './context_landing_page';

export const mountApp = ({
  core,
  element,
  history,
}: {
  core: CoreStart;
  element: HTMLElement;
  history: ScopedHistory;
}) => {
  ReactDOM.render(
    core.rendering.addContext(
      <Router history={history}>
        <ContextLandingPage />
      </Router>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
