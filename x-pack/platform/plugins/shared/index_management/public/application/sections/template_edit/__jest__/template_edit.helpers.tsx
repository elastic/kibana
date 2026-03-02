/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import type { HttpSetup, UserProfileService } from '@kbn/core/public';
import {
  analyticsServiceMock,
  applicationServiceMock,
  chromeServiceMock,
  docLinksServiceMock,
  executionContextServiceMock,
  fatalErrorsServiceMock,
  httpServiceMock,
  i18nServiceMock,
  notificationServiceMock,
  scopedHistoryMock,
  themeServiceMock,
  uiSettingsServiceMock,
  coreMock,
} from '@kbn/core/public/mocks';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import SemVer from 'semver/classes/semver';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import { MAJOR_VERSION } from '../../../../../common';
import { API_BASE_PATH } from '../../../../../common/constants';
import { TEMPLATE_NAME, MAPPINGS as DEFAULT_MAPPING } from './constants';
import { TemplateEdit } from '..';
import type { AppDependencies } from '../../../app_context';
import { AppContextProvider } from '../../../app_context';
import type { IndexManagementStartServices } from '../../../../types';
import { httpService } from '../../../services/http';
import { breadcrumbService } from '../../../services/breadcrumbs';
import { documentationService } from '../../../services/documentation';
import { notificationService } from '../../../services/notification';
import { UiMetricService } from '../../../services/ui_metric';
import { setUiMetricService } from '../../../services/api';
import { MappingsEditorProvider } from '../../../components';
import { ComponentTemplatesProvider } from '../../../components/component_templates/component_templates_context';
import { ExtensionsService } from '../../../../services/extensions_service';

export const UPDATED_INDEX_PATTERN = ['updatedIndexPattern'];
export const UPDATED_MAPPING_TEXT_FIELD_NAME = 'updated_text_datatype';
export const MAPPING = {
  ...DEFAULT_MAPPING,
  properties: {
    text_datatype: {
      type: 'text',
    },
  },
};

export const NONEXISTENT_COMPONENT_TEMPLATE = {
  name: 'component_template@custom',
  hasMappings: false,
  hasAliases: false,
  hasSettings: false,
  usedBy: [],
};

export const EXISTING_COMPONENT_TEMPLATE = {
  name: 'test_component_template',
  hasMappings: true,
  hasAliases: false,
  hasSettings: false,
  usedBy: [],
  isManaged: false,
};

export const kibanaVersion = new SemVer(MAJOR_VERSION);

/**
 * Helper to render TemplateEdit component with routing.
 */
export const renderTemplateEdit = (httpSetup: HttpSetup, templateName: string = TEMPLATE_NAME) => {
  const { GlobalFlyoutProvider } = GlobalFlyout;

  httpService.setup(httpSetup);
  breadcrumbService.setup(() => undefined);
  documentationService.setup(docLinksServiceMock.createStartContract());
  notificationService.setup(notificationServiceMock.createStartContract());

  const uiMetricService = new UiMetricService('index_management');
  setUiMetricService(uiMetricService);

  const history = scopedHistoryMock.create();

  const applicationService = applicationServiceMock.createStartContract();
  const shareStart = sharePluginMock.createStartContract();
  const startServicesMock = {
    i18n: i18nServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    analytics: analyticsServiceMock.createAnalyticsServiceStart(),
  };

  const extensionsService = new ExtensionsService();
  extensionsService.setup();

  const appDependencies = {
    services: {
      // These are expected by various UI components via app context
      extensionsService,
      uiMetricService,
      notificationService,
      httpService,
    },
    history,
    url: shareStart.url,
    core: {
      getUrlForApp: applicationService.getUrlForApp,
      executionContext: executionContextServiceMock.createStartContract(),
      http: httpSetup,
      application: applicationService,
      chrome: chromeServiceMock.createStartContract(),
      fatalErrors: fatalErrorsServiceMock.createSetupContract(),
      i18n: i18nServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
    },
    plugins: {
      usageCollection: {} as unknown as AppDependencies['plugins']['usageCollection'],
      isFleetEnabled: false,
      share: shareStart,
      cloud: undefined,
      console: undefined,
      licensing: undefined,
      ml: undefined,
      streams: undefined,
      reindexService: {} as unknown as AppDependencies['plugins']['reindexService'],
    },
    // Stateful defaults matching the existing integration harness, but scoped to what these tests need.
    config: {
      enableLegacyTemplates: true,
      enableIndexActions: true,
      enableIndexStats: true,
      enableSizeAndDocCount: false,
      enableDataStreamStats: true,
      editableIndexSettings: 'all',
      enableMappingsSourceFieldSection: true,
      enableTogglingDataRetention: true,
      enableProjectLevelRetentionChecks: true,
      enableSemanticText: true,
      enforceAdaptiveAllocations: false,
      enableFailureStoreRetentionDisabling: true,
      isServerless: false,
    },
    overlays: coreMock.createStart().overlays,
    privs: {
      monitor: true,
      manageEnrich: true,
      monitorEnrich: true,
      manageIndexTemplates: true,
    },
    setBreadcrumbs: jest.fn(),
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    settings: settingsServiceMock.createStartContract(),
    docLinks: docLinksServiceMock.createStartContract(),
    kibanaVersion,
    canUseSyntheticSource: false,
  } as AppDependencies;

  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings: uiSettingsServiceMock.createSetupContract(),
    settings: settingsServiceMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    chrome: chromeServiceMock.createStartContract(),
    application: appDependencies.core.application,
    kibanaVersion: {
      get: () => kibanaVersion,
    },
  });

  const componentTemplatesDeps = {
    httpClient: httpSetup,
    apiBasePath: API_BASE_PATH,
    trackMetric: jest.fn(),
    docLinks: docLinksServiceMock.createStartContract(),
    toasts: notificationServiceMock.createSetupContract().toasts,
    getUrlForApp: applicationService.getUrlForApp,
    executionContext: executionContextServiceMock.createStartContract(),
    startServices: {
      analytics: { reportEvent: jest.fn() },
      i18n: i18nServiceMock.createStartContract(),
      overlays: coreMock.createStart().overlays,
      theme: { theme$: themeServiceMock.createStartContract().theme$ },
      userProfile: {} as unknown as UserProfileService,
    } satisfies IndexManagementStartServices,
  };

  const EditWithRouter = () => (
    <MemoryRouter initialEntries={[`/edit_template/${templateName}`]}>
      <Route path="/edit_template/:name" component={TemplateEdit} />
    </MemoryRouter>
  );

  return render(
    <KibanaRootContextProvider globalStyles={false} {...startServicesMock}>
      <KibanaReactContextProvider>
        <AppContextProvider value={appDependencies}>
          <MappingsEditorProvider>
            <ComponentTemplatesProvider value={componentTemplatesDeps}>
              <GlobalFlyoutProvider>
                <EditWithRouter />
              </GlobalFlyoutProvider>
            </ComponentTemplatesProvider>
          </MappingsEditorProvider>
        </AppContextProvider>
      </KibanaReactContextProvider>
    </KibanaRootContextProvider>
  );
};

/**
 * Helper to fill form step-by-step.
 */
export const completeStep = {
  async one({
    indexPatterns,
    priority,
    allowAutoCreate,
  }: {
    indexPatterns?: string[];
    priority?: number;
    allowAutoCreate?: 'TRUE' | 'FALSE' | 'NO_OVERWRITE' | 'DO_NOT_OVERWRITE';
  } = {}) {
    if (indexPatterns) {
      await screen.findByTestId('indexPatternsField');
      const indexPatternsComboBox = new EuiComboBoxTestHarness('indexPatternsField');

      await indexPatternsComboBox.clear();
      for (const pattern of indexPatterns) {
        indexPatternsComboBox.addCustomValue(pattern);
      }
      await indexPatternsComboBox.close({ timeout: 250 });
    }

    if (priority !== undefined) {
      const priorityRow = screen.getByTestId('priorityField');
      const priorityInput = within(priorityRow).getByRole('spinbutton');
      fireEvent.change(priorityInput, { target: { value: String(priority) } });
    }

    if (allowAutoCreate) {
      const autoCreateRow = screen.getByTestId('allowAutoCreateField');
      let labelMatch = /Do not overwrite/;
      if (allowAutoCreate === 'TRUE') labelMatch = /True/;
      if (allowAutoCreate === 'FALSE') labelMatch = /False/;
      const radio = within(autoCreateRow).getByLabelText(labelMatch);
      fireEvent.click(radio);
    }

    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepComponents');
  },
  async two(componentName?: string) {
    if (componentName) {
      const listContainer = await screen.findByTestId('componentTemplatesList');
      const componentNames = within(listContainer).getAllByTestId('name');
      const componentsFound = componentNames.map((el) => el.textContent);
      const index = componentsFound.indexOf(componentName);
      if (index >= 0) {
        const addButtons = within(listContainer).getAllByTestId('action-plusInCircle');
        fireEvent.click(addButtons[index]);
      }
    }

    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepSettings');
  },
  async three(settingsJson?: string) {
    if (settingsJson) {
      const editor = screen.getByTestId('settingsEditor');
      fireEvent.change(editor, { target: { value: settingsJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepMappings');
  },
  async four() {
    await screen.findByTestId('documentFields');
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepAliases');
  },
  async five(aliasesJson?: string) {
    if (aliasesJson) {
      const editor = screen.getByTestId('aliasesEditor');
      fireEvent.change(editor, { target: { value: aliasesJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('summaryTabContent');
  },
};

type HttpMethod = 'GET' | 'PUT' | 'DELETE' | 'POST';

const registerHttpRequestMockHelpers = (
  httpSetup: ReturnType<typeof httpServiceMock.createSetupContract>
) => {
  const mockResponses = new Map<HttpMethod, Map<string, Promise<unknown>>>(
    ['GET', 'PUT', 'DELETE', 'POST'].map(
      (method) => [method, new Map()] as [HttpMethod, Map<string, Promise<unknown>>]
    )
  );

  const mockMethodImplementation = (method: HttpMethod, path: string) => {
    return mockResponses.get(method)?.get(path) ?? Promise.resolve({});
  };

  httpSetup.get.mockImplementation((path) =>
    mockMethodImplementation('GET', path as unknown as string)
  );
  httpSetup.delete.mockImplementation((path) =>
    mockMethodImplementation('DELETE', path as unknown as string)
  );
  httpSetup.post.mockImplementation((path) =>
    mockMethodImplementation('POST', path as unknown as string)
  );
  httpSetup.put.mockImplementation((path) =>
    mockMethodImplementation('PUT', path as unknown as string)
  );

  const mockResponse = (method: HttpMethod, path: string, response?: unknown) => {
    return mockResponses.get(method)!.set(path, Promise.resolve(response));
  };

  return {
    setLoadTemplateResponse: (templateId: string, response?: unknown) =>
      mockResponse('GET', `${API_BASE_PATH}/index_templates/${templateId}`, response),
    setLoadComponentTemplatesResponse: (response?: unknown) =>
      mockResponse('GET', `${API_BASE_PATH}/component_templates`, response),
    setLoadNodesPluginsResponse: (response?: unknown) =>
      mockResponse('GET', `${API_BASE_PATH}/nodes/plugins`, response),
  };
};

export const setupTemplateEditEnvironment = () => {
  const httpSetup = httpServiceMock.createSetupContract();
  const httpRequestsMockHelpers = registerHttpRequestMockHelpers(httpSetup);

  // Provide safe defaults for requests that happen during the wizard flow
  httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
  httpRequestsMockHelpers.setLoadNodesPluginsResponse([]);

  return { httpSetup, httpRequestsMockHelpers };
};
