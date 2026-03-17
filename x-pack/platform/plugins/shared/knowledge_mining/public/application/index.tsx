/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { Router, Route, Switch } from '@kbn/shared-ux-router';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { SuggestionsPage } from './pages/suggestions_page';
import { MemoriesPage } from './pages/memories_page';
import { SettingsPage } from './pages/settings_page';

export const KnowledgeMiningApp = ({ coreStart }: { coreStart: CoreStart }) => {
  const basename = coreStart.http.basePath.prepend('/app/knowledgeMining');

  return (
    <Router basename={basename}>
      <KibanaPageTemplate>
        <Switch>
          <Route path="/suggestions" component={SuggestionsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/" component={MemoriesPage} />
        </Switch>
      </KibanaPageTemplate>
    </Router>
  );
};
