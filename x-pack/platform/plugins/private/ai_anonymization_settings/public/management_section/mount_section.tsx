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
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { AnonymizationSettingsApp } from '../components/anonymization_settings_app';
import type { AiAnonymizationSettingsStartDeps } from '../plugin';

interface MountSectionParams {
  core: CoreSetup<AiAnonymizationSettingsStartDeps>;
  mountParams: ManagementAppMountParams;
}

export const mountManagementSection = async ({
  core,
  mountParams: { element, setBreadcrumbs, history },
}: MountSectionParams) => {
  const [coreStart, startDeps] = await core.getStartServices();

  coreStart.chrome.docTitle.change(
    i18n.translate('xpack.aiAnonymizationSettings.app.titleBar', {
      defaultMessage: 'Anonymization',
    })
  );

  const AnonymizationSettingsAppWithContext = () => (
    <I18nProvider>
      <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
        <Router history={history}>
          <AnonymizationSettingsApp setBreadcrumbs={setBreadcrumbs} />
        </Router>
      </KibanaContextProvider>
    </I18nProvider>
  );

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <AnonymizationSettingsAppWithContext />
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
