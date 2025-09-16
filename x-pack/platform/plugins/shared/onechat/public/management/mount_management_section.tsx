/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { wrapWithTheme } from '@kbn/react-kibana-context-theme';
import { AgentBuilderSettingsApp } from './components/agent_builder_settings_app';
import { labels } from '../application/utils/i18n';

interface MountSectionParams {
  core: CoreSetup;
  mountParams: ManagementAppMountParams;
}

export const mountManagementSection = async ({
  core,
  mountParams: { element, setBreadcrumbs, history },
}: MountSectionParams) => {
  const [coreStart, startDeps] = await core.getStartServices();

  coreStart.chrome.docTitle.change(labels.management.agentBuilder);
  setBreadcrumbs([{ text: labels.management.agentBuilder }]);

  const App = () => (
    <I18nProvider>
      <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
        <Router history={history}>
          <AgentBuilderSettingsApp />
        </Router>
      </KibanaContextProvider>
    </I18nProvider>
  );

  ReactDOM.render(wrapWithTheme(<App />, core.theme), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
