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
import { GenAiSettingsApp } from '../components/gen_ai_settings_app';
import { EnabledFeaturesContextProvider } from '../contexts/serverless_context';

interface MountSectionParams {
  core: CoreSetup;
  mountParams: ManagementAppMountParams;
  isServerless: boolean;
}

export const mountManagementSection = async ({
  core,
  mountParams: { element, setBreadcrumbs, history },
  isServerless,
}: MountSectionParams) => {
  const [coreStart, startDeps] = await core.getStartServices();

  const GenAiSettingsAppWithContext = () => (
    <I18nProvider>
      <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
        <EnabledFeaturesContextProvider isServerless={isServerless}>
          <Router history={history}>
            <GenAiSettingsApp setBreadcrumbs={setBreadcrumbs} coreStart={coreStart} />
          </Router>
        </EnabledFeaturesContextProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );

  ReactDOM.render(<GenAiSettingsAppWithContext />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
