/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { merge } from 'lodash';
import type { LocationDescriptorObject } from 'history';
import SemVer from 'semver/classes/semver';

import type { HttpSetup } from '@kbn/core/public';
import {
  notificationServiceMock,
  docLinksServiceMock,
  uiSettingsServiceMock,
  themeServiceMock,
  scopedHistoryMock,
  executionContextServiceMock,
  applicationServiceMock,
  fatalErrorsServiceMock,
  httpServiceMock,
  chromeServiceMock,
} from '@kbn/core/public/mocks';

import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { EuiThemeProvider } from '@elastic/eui';
import { of } from 'rxjs';
import { MAJOR_VERSION } from '../../../common';
import { AppContextProvider } from '../../../public/application/app_context';
import { httpService } from '../../../public/application/services/http';
import { breadcrumbService } from '../../../public/application/services/breadcrumbs';
import { documentationService } from '../../../public/application/services/documentation';
import { notificationService } from '../../../public/application/services/notification';
import { ExtensionsService } from '../../../public/services';
import { UiMetricService } from '../../../public/application/services/ui_metric';
import { setUiMetricService } from '../../../public/application/services/api';
import { setExtensionsService } from '../../../public/application/store/selectors/extension_service';
import {
  MappingsEditorProvider,
  ComponentTemplatesProvider,
} from '../../../public/application/components';
import { componentTemplatesMockDependencies } from '../../../public/application/components/component_templates/__jest__';
import { init as initHttpRequests } from './http_requests';

const { GlobalFlyoutProvider } = GlobalFlyout;

export const services = {
  extensionsService: new ExtensionsService(),
  uiMetricService: new UiMetricService('index_management'),
  notificationService: notificationServiceMock.createSetupContract(),
};

services.uiMetricService.setup({ reportUiCounter() {} } as any);
setExtensionsService(services.extensionsService);
setUiMetricService(services.uiMetricService);

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

const applicationService = applicationServiceMock.createStartContract();
// Add cloudConnect capabilities for EisCloudConnectPromoCallout component
applicationService.capabilities = {
  ...applicationService.capabilities,
  cloudConnect: {
    show: true,
    configure: true,
  },
};

const appDependencies = {
  services,
  history,
  url: sharePluginMock.createStartContract().url,
  core: {
    getUrlForApp: applicationService.getUrlForApp,
    executionContext: executionContextServiceMock.createStartContract(),
    http: httpServiceMock.createSetupContract(),
    application: applicationService,
    chrome: {
      ...chromeServiceMock.createStartContract(),
      // Used by `CreateIndexButton` via `useObservable(chrome.getActiveSolutionNavId$())`.
      // Returning a non-`'es'` value keeps tests on the modal flow (not a link).
      getActiveSolutionNavId$: () => of(undefined),
    },
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
  },
  plugins: {
    usageCollection: usageCollectionPluginMock.createSetupContract(),
    isFleetEnabled: false,
    share: sharePluginMock.createStartContract(),
    cloud: cloudMock.createSetup(),
  },
  // Default stateful configuration
  config: {
    enableLegacyTemplates: true,
    enableIndexActions: true,
    enableIndexStats: true,
    enableDataStreamStats: true,
    editableIndexSettings: 'all',
    enableMappingsSourceFieldSection: true,
    enableTogglingDataRetention: true,
    enableSemanticText: true,
  },
  overlays: {
    openConfirm: jest.fn(),
  },
  privs: {
    monitor: true,
    manageEnrich: true,
    monitorEnrich: true,
    manageIndexTemplates: true,
  },
} as any;

export const kibanaVersion = new SemVer(MAJOR_VERSION);

const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  settings: settingsServiceMock.createStartContract(),
  theme: themeServiceMock.createStartContract(),
  chrome: {
    ...chromeServiceMock.createStartContract(),
    getActiveSolutionNavId$: () => of('es'),
  },
  application: applicationService,
  kibanaVersion: {
    get: () => kibanaVersion,
  },
});

export const setupEnvironment = () => {
  breadcrumbService.setup(() => undefined);
  documentationService.setup(docLinksServiceMock.createStartContract());
  notificationService.setup(notificationServiceMock.createStartContract());

  return initHttpRequests();
};

export const WithAppDependencies =
  (Comp: any, httpSetup: HttpSetup, overridingDependencies: any = {}) =>
  (props: any) => {
    httpService.setup(httpSetup);
    const mergedDependencies = merge(
      {
        services: { httpService },
      },
      appDependencies,
      overridingDependencies,
      // Ensure components that pull `core.http` from app context use the same mocked client
      // instance (`httpSetup`) configured by `setupEnvironment()`.
      { core: { http: httpSetup } }
    );
    return (
      <KibanaReactContextProvider>
        <EuiThemeProvider>
          <AppContextProvider value={mergedDependencies}>
            <MappingsEditorProvider>
              <ComponentTemplatesProvider value={componentTemplatesMockDependencies(httpSetup)}>
                <GlobalFlyoutProvider>
                  <Comp {...props} />
                </GlobalFlyoutProvider>
              </ComponentTemplatesProvider>
            </MappingsEditorProvider>
          </AppContextProvider>
        </EuiThemeProvider>
      </KibanaReactContextProvider>
    );
  };
