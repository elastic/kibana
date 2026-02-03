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
import { i18n } from '@kbn/i18n';
import { wrapWithTheme } from '@kbn/react-kibana-context-theme';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { GenAiSettingsApp } from '../components/gen_ai_settings_app';
import { EnabledFeaturesContextProvider } from '../contexts/enabled_features_context';
import type { GenAiSettingsConfigType } from '../../common/config';
import { createCallGenAiSettingsAPI } from '../api/client';
import { SettingsContextProvider } from '../contexts/settings_context';

interface MountSectionParams {
  core: CoreSetup;
  mountParams: ManagementAppMountParams;
  config: GenAiSettingsConfigType;
}

export const mountManagementSection = async ({
  core,
  mountParams: { element, setBreadcrumbs, history },
  config,
}: MountSectionParams) => {
  const [coreStart, startDeps] = await core.getStartServices();

  coreStart.chrome.docTitle.change(
    i18n.translate('xpack.genAiSettings.app.titleBar', {
      defaultMessage: 'GenAI Settings',
    })
  );

  const genAiSettingsApi = createCallGenAiSettingsAPI(coreStart);
  const queryClient = new QueryClient();
  const GenAiSettingsAppWithContext = () => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <KibanaContextProvider services={{ ...coreStart, ...startDeps, genAiSettingsApi }}>
          <EnabledFeaturesContextProvider config={config}>
            <SettingsContextProvider>
              <Router history={history}>
                <GenAiSettingsApp setBreadcrumbs={setBreadcrumbs} />
              </Router>
            </SettingsContextProvider>
          </EnabledFeaturesContextProvider>
        </KibanaContextProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  ReactDOM.render(wrapWithTheme(<GenAiSettingsAppWithContext />, core.theme), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
