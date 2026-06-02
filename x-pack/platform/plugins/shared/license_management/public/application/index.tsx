/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import type { ScopedHistory, ExecutionContextStart } from '@kbn/core/public';

import type { AppDependencies } from './app_context';
import { AppProviders } from './app_providers';
import { App } from './app.container';
import type { TelemetryPluginStart } from './lib/telemetry';

interface AppWithRouterProps {
  history: ScopedHistory;
  telemetry?: TelemetryPluginStart;
  executionContext: ExecutionContextStart;
}

const AppWithRouter = (props: AppWithRouterProps) => (
  <Router history={props.history}>
    <App {...props} />
  </Router>
);

export const renderApp = (element: Element, dependencies: AppDependencies) => {
  render(
    <AppProviders appDependencies={dependencies}>
      <AppWithRouter
        telemetry={dependencies.plugins.telemetry}
        history={dependencies.services.history}
        executionContext={dependencies.core.executionContext}
      />
    </AppProviders>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};

export type { AppDependencies };
