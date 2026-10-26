/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { AppMountParameters, ScopedHistory } from '@kbn/core/public';
import type { ChromeStart, NotificationsStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { CreatePage } from './create_page';
import { ListPage } from './list_page';
import { ViewPage } from './view_page';
import type { SavedAppsClient } from './saved_apps_client';

export interface AppServices {
  client: SavedAppsClient;
  chrome: ChromeStart;
  notifications: NotificationsStart;
  /** Whether the user may create, change and delete apps. */
  canSave: boolean;
  /** Whether anything offers the editor; off, apps are made and changed by chat. */
  isEditorEnabled: boolean;
  /** Chat with the assistant. Absent when it is not available, and then nothing offers it. */
  agentBuilder?: AgentBuilderPluginStart;
  onAppLeave: AppMountParameters['onAppLeave'];
  /** Carries an app to a dashboard. */
  stateTransfer: EmbeddableStateTransfer;
  /** Whether the user may change dashboards, which adding an app to one does. */
  canWriteDashboards: boolean;
}

export const App = ({ history, ...services }: AppServices & { history: ScopedHistory }) => (
  <Router history={history}>
    <Routes>
      <Route path="/" exact>
        <ListPage {...services} />
      </Route>
      <Route path="/create" exact>
        <CreatePage {...services} />
      </Route>
      <Route path="/view/:id" exact>
        <ViewPage {...services} />
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </Routes>
  </Router>
);
