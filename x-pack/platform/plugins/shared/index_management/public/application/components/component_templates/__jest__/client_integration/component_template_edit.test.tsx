/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { i18nServiceMock, themeServiceMock, analyticsServiceMock } from '@kbn/core/public/mocks';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { coreMock } from '@kbn/core/public/mocks';

import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import { setupEnvironment } from './helpers';
import { API_BASE_PATH } from './helpers/constants';
import { WithAppDependencies } from './helpers/setup_environment';
import { ComponentTemplateEdit } from '../../component_template_wizard';
import { BASE_PATH } from '../../../../../../common';

// Services required for KibanaRenderContextProvider (provides i18n, theme, analytics)
const startServicesMock = {
  i18n: i18nServiceMock.createStartContract(),
  theme: themeServiceMock.createStartContract(),
  analytics: analyticsServiceMock.createAnalyticsServiceStart(),
};

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.target.value);
        }}
      />
    ),
  };
});

const renderComponentTemplateEdit = (httpSetup: any, coreStart?: any, queryParams: string = '') => {
  const routePath = `${BASE_PATH}/edit_component_template/comp-1${queryParams}`;
  const EditWithRouter = () => (
    <MemoryRouter initialEntries={[routePath]}>
      <Route
        path={`${BASE_PATH}/edit_component_template/:name`}
        component={ComponentTemplateEdit}
      />
    </MemoryRouter>
  );

  return render(
    <KibanaRenderContextProvider {...startServicesMock}>
      {React.createElement(WithAppDependencies(EditWithRouter, httpSetup, coreStart))}
    </KibanaRenderContextProvider>
  );
};

/**
 * Helper to complete form steps (reusing from component_template_create pattern)
 */
const getEnabledNextButton = () => {
  const nextButtons = screen.getAllByTestId('nextButton');
  return nextButtons.find((btn) => !btn.hasAttribute('disabled')) || nextButtons[0];
};

const completeStep = {
  async settings(settingsJson?: string) {
    if (settingsJson) {
      const editor = screen.getByTestId('settingsEditor');
      fireEvent.change(editor, { target: { value: settingsJson } });
    }
    const enabledNextButton = getEnabledNextButton();
    await waitFor(() => expect(enabledNextButton).toBeEnabled());
    fireEvent.click(enabledNextButton);
    await screen.findByTestId('stepMappings');
  },
  async mappings(mappingFields?: any[]) {
    if (mappingFields) {
      for (const field of mappingFields) {
        const { name, type } = field;
        const createFieldForm = screen.getByTestId('createFieldForm');

        const nameInput = screen.getByTestId('nameParameterInput');
        fireEvent.change(nameInput, { target: { value: name } });

        const typeSelect = within(createFieldForm).getByTestId('mockComboBox');
        fireEvent.change(typeSelect, { target: { value: type } });

        const addButton = within(createFieldForm).getByTestId('addButton');
        const fieldsBefore = screen.queryAllByText(name).length;

        fireEvent.click(addButton);

        await waitFor(() => {
          expect(screen.queryAllByText(name).length).toBeGreaterThan(fieldsBefore);
        });
      }

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    }

    await screen.findByTestId('documentFields');
    const enabledNextButton = getEnabledNextButton();
    await waitFor(() => expect(enabledNextButton).toBeEnabled());
    fireEvent.click(enabledNextButton);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    await screen.findByTestId('stepAliases');
  },
  async aliases(aliasesJson?: string) {
    if (aliasesJson) {
      const editor = screen.getByTestId('aliasesEditor');
      fireEvent.change(editor, { target: { value: aliasesJson } });
    }
    const enabledNextButton = getEnabledNextButton();
    await waitFor(() => expect(enabledNextButton).toBeEnabled());
    fireEvent.click(enabledNextButton);
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
    await screen.findByTestId('stepReview');
  },
};

describe('<ComponentTemplateEdit />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let coreStart: ReturnType<(typeof coreMock)['createStart']>;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.spyOn(breadcrumbService, 'setBreadcrumbs');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    coreStart = coreMock.createStart();
  });

  const COMPONENT_TEMPLATE_NAME = 'comp-1';
  const COMPONENT_TEMPLATE_TO_EDIT = {
    name: COMPONENT_TEMPLATE_NAME,
    deprecated: true,
    template: {
      settings: { number_of_shards: 1 },
    },
  };

  describe('On component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(
        COMPONENT_TEMPLATE_TO_EDIT.name,
        COMPONENT_TEMPLATE_TO_EDIT
      );
      httpRequestsMockHelpers.setGetComponentTemplateDatastream(COMPONENT_TEMPLATE_TO_EDIT.name, {
        data_streams: [],
      });

      renderComponentTemplateEdit(httpSetup, coreStart);
      await screen.findByTestId('pageTitle');
    });

    test('updates the breadcrumbs to component templates', () => {
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.componentTemplateEdit
      );
    });

    test('should set the correct page title', () => {
      expect(screen.getByTestId('pageTitle')).toBeInTheDocument();
      expect(screen.getByTestId('deprecatedTemplateCallout')).toBeInTheDocument();
      expect(screen.getByTestId('pageTitle')).toHaveTextContent(
        `Edit component template '${COMPONENT_TEMPLATE_NAME}'`
      );
    });

    it('should set the name field to read only', () => {
      const nameRow = screen.getByTestId('nameField');
      const nameInput = within(nameRow).getByRole('textbox');
      expect(nameInput).toBeDisabled();
    });

    it('should allow to go directly to a step', async () => {
      renderComponentTemplateEdit(httpSetup, coreStart, '?step=mappings');
      await screen.findByTestId('mappingsEditor');
      expect(screen.getByTestId('mappingsEditor')).toBeInTheDocument();
    });
  });

  describe('form payload', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(
        COMPONENT_TEMPLATE_TO_EDIT.name,
        COMPONENT_TEMPLATE_TO_EDIT
      );
      httpRequestsMockHelpers.setGetComponentTemplateDatastream(COMPONENT_TEMPLATE_TO_EDIT.name, {
        data_streams: [],
      });

      renderComponentTemplateEdit(httpSetup, coreStart);
      await screen.findByTestId('pageTitle');
    });

    it('should send the correct payload with changed values', async () => {
      const versionRow = screen.getByTestId('versionField');
      const versionInput = within(versionRow).getByRole('spinbutton');
      fireEvent.change(versionInput, { target: { value: '1' } });

      const nextButtons = screen.getAllByTestId('nextButton');
      const enabledNextButton =
        nextButtons.find((btn) => !btn.hasAttribute('disabled')) || nextButtons[0];
      await waitFor(() => expect(enabledNextButton).toBeEnabled());
      fireEvent.click(enabledNextButton);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      await screen.findByTestId('stepSettings');

      await completeStep.settings();
      await completeStep.mappings();
      await completeStep.aliases();

      const submitButton = getEnabledNextButton();
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/component_templates/${COMPONENT_TEMPLATE_TO_EDIT.name}`,
          expect.objectContaining({
            body: JSON.stringify({
              ...COMPONENT_TEMPLATE_TO_EDIT,
              template: {
                ...COMPONENT_TEMPLATE_TO_EDIT.template,
              },
              version: 1,
            }),
          })
        );
      });

      // Mapping rollout modal should not be opened if the component template is not managed
      expect(coreStart.overlays.openModal).not.toHaveBeenCalled();
    });
  });

  describe('can rollover linked datastreams', () => {
    const DATASTREAM_NAME = 'logs-test-default';
    const CUSTOM_COMPONENT_TEMPLATE = 'comp-1@custom';
    const ENCODED_CUSTOM_COMPONENT_TEMPLATE = encodeURIComponent(CUSTOM_COMPONENT_TEMPLATE);

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(
        ENCODED_CUSTOM_COMPONENT_TEMPLATE,
        Object.assign({}, COMPONENT_TEMPLATE_TO_EDIT, {
          name: CUSTOM_COMPONENT_TEMPLATE,
        })
      );

      httpRequestsMockHelpers.setGetComponentTemplateDatastream(ENCODED_CUSTOM_COMPONENT_TEMPLATE, {
        data_streams: [DATASTREAM_NAME],
      });

      renderComponentTemplateEdit(httpSetup, coreStart, '@custom');
      await screen.findByTestId('pageTitle');
    });

    it('should show mappings rollover modal on save if apply mappings call failed', async () => {
      httpRequestsMockHelpers.setPostDatastreamMappingsFromTemplate(
        DATASTREAM_NAME,
        {},
        { message: 'Bad request', statusCode: 400 }
      );

      const versionRow = screen.getByTestId('versionField');
      const versionInput = within(versionRow).getByRole('spinbutton');
      fireEvent.change(versionInput, { target: { value: '1' } });

      const nextButtons = screen.getAllByTestId('nextButton');
      const enabledNextButton =
        nextButtons.find((btn) => !btn.hasAttribute('disabled')) || nextButtons[0];
      await waitFor(() => expect(enabledNextButton).toBeEnabled());
      fireEvent.click(enabledNextButton);

      await screen.findByTestId('stepSettings');

      await completeStep.settings();
      await completeStep.mappings();
      await completeStep.aliases();

      const submitButton = getEnabledNextButton();
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/component_templates/${ENCODED_CUSTOM_COMPONENT_TEMPLATE}`,
          expect.anything()
        );
      });

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/data_streams/${DATASTREAM_NAME}/mappings_from_template`,
          expect.anything()
        );
      });

      expect(coreStart.overlays.openModal).toHaveBeenCalled();
    });

    it('should not show mappings rollover modal on save if apply mappings call succeed', async () => {
      httpRequestsMockHelpers.setPostDatastreamMappingsFromTemplate(DATASTREAM_NAME, {
        success: true,
      });

      const versionRow = screen.getByTestId('versionField');
      const versionInput = within(versionRow).getByRole('spinbutton');
      fireEvent.change(versionInput, { target: { value: '1' } });

      const nextButtons = screen.getAllByTestId('nextButton');
      const enabledNextButton =
        nextButtons.find((btn) => !btn.hasAttribute('disabled')) || nextButtons[0];
      await waitFor(() => expect(enabledNextButton).toBeEnabled());
      fireEvent.click(enabledNextButton);

      await screen.findByTestId('stepSettings');

      await completeStep.settings();
      await completeStep.mappings();
      await completeStep.aliases();

      const submitButton = getEnabledNextButton();
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/component_templates/${ENCODED_CUSTOM_COMPONENT_TEMPLATE}`,
          expect.anything()
        );
      });

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/data_streams/${DATASTREAM_NAME}/mappings_from_template`,
          expect.anything()
        );
      });

      expect(coreStart.overlays.openModal).not.toHaveBeenCalled();
    });

    it('should show mappings rollover modal on save if referenced index template is managed and packaged', async () => {
      httpRequestsMockHelpers.setLoadComponentTemplateResponse(
        COMPONENT_TEMPLATE_TO_EDIT.name,
        Object.assign({}, COMPONENT_TEMPLATE_TO_EDIT, {
          _meta: {},
        })
      );

      httpRequestsMockHelpers.setGetComponentTemplateDatastream(COMPONENT_TEMPLATE_TO_EDIT.name, {
        data_streams: [DATASTREAM_NAME],
      });

      httpRequestsMockHelpers.setLoadReferencedIndexTemplateMetaResponse(
        COMPONENT_TEMPLATE_TO_EDIT.name,
        {
          package: {
            name: 'security',
          },
          managed_by: 'security',
          managed: true,
        }
      );

      renderComponentTemplateEdit(httpSetup, coreStart);
      await screen.findByTestId('pageTitle');

      httpRequestsMockHelpers.setPostDatastreamMappingsFromTemplate(
        DATASTREAM_NAME,
        {},
        { message: 'Bad request', statusCode: 400 }
      );

      const versionRow = screen.getByTestId('versionField');
      const versionInput = within(versionRow).getByRole('spinbutton');
      fireEvent.change(versionInput, { target: { value: '1' } });

      const nextButtons = screen.getAllByTestId('nextButton');
      const enabledNextButton =
        nextButtons.find((btn) => !btn.hasAttribute('disabled')) || nextButtons[0];
      await waitFor(() => expect(enabledNextButton).toBeEnabled());
      fireEvent.click(enabledNextButton);

      await screen.findByTestId('stepSettings');

      await completeStep.settings();
      await completeStep.mappings();
      await completeStep.aliases();

      await screen.findByTestId('stepReview');
      // Make sure the list of affected mappings is shown
      await screen.findByTestId('affectedMappingsList');
      expect(screen.getByTestId('affectedMappingsList')).toBeInTheDocument();

      const submitButton = getEnabledNextButton();
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        const lastPut = httpSetup.put.mock.calls[httpSetup.put.mock.calls.length - 1];
        expect(lastPut?.[0]).toContain(`${API_BASE_PATH}/component_templates/`);
      });

      await waitFor(() => {
        const lastPost = httpSetup.post.mock.calls[httpSetup.post.mock.calls.length - 1];
        expect(lastPost?.[0]).toContain(
          `${API_BASE_PATH}/data_streams/${DATASTREAM_NAME}/mappings_from_template`
        );
      });

      expect(coreStart.overlays.openModal).toHaveBeenCalled();
    });
  });
});
