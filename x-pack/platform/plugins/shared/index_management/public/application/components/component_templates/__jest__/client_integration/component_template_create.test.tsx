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
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import { setupEnvironment } from './helpers';
import { API_BASE_PATH } from './helpers/constants';
import { WithAppDependencies } from './helpers/setup_environment';
import { serializeAsESLifecycle } from '../../../../../../common/lib';
import { ComponentTemplateCreate } from '../../component_template_wizard';
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

const renderComponentTemplateCreate = (httpSetup: any) => {
  const routePath = `${BASE_PATH}/create_component_template`;
  const CreateWithRouter = () => (
    <MemoryRouter initialEntries={[routePath]}>
      <Route path={`${BASE_PATH}/create_component_template`} component={ComponentTemplateCreate} />
    </MemoryRouter>
  );

  return render(
    <KibanaRenderContextProvider {...startServicesMock}>
      {React.createElement(WithAppDependencies(CreateWithRouter, httpSetup))}
    </KibanaRenderContextProvider>
  );
};

/**
 * Helper to fill form step-by-step.
 */
const completeStep = {
  async logistics({ name, lifecycle }: { name: string; lifecycle?: any }) {
    if (name) {
      const nameRow = screen.getByTestId('nameField');
      const nameInput = within(nameRow).getByRole('textbox');
      fireEvent.change(nameInput, { target: { value: name } });
    }

    if (lifecycle && lifecycle.enabled) {
      const lifecycleSwitchRow = screen.getByTestId('dataRetentionToggle');
      const lifecycleSwitch = within(lifecycleSwitchRow).getByRole('switch');
      fireEvent.click(lifecycleSwitch);

      await screen.findByTestId('valueDataRetentionField');

      const retentionInput = screen.getByTestId('valueDataRetentionField');
      fireEvent.change(retentionInput, { target: { value: String(lifecycle.value) } });
    }

    // Wait for next button to be enabled (form validation complete)
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());

    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepSettings');
  },
  async settings(settingsJson?: string) {
    if (settingsJson) {
      const editor = screen.getByTestId('settingsEditor');
      fireEvent.change(editor, { target: { value: settingsJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepMappings');
  },
  async mappings(mappingFields?: any[]) {
    if (mappingFields) {
      for (const field of mappingFields) {
        const { name, type } = field;
        const createFieldForm = screen.getByTestId('createFieldForm');

        const nameInput = screen.getByTestId('nameParameterInput');
        fireEvent.change(nameInput, { target: { value: name } });

        // Use EuiComboBoxTestHarness for field type selection
        await within(createFieldForm).findByTestId('fieldType');
        const fieldTypeComboBox = new EuiComboBoxTestHarness('fieldType');
        fieldTypeComboBox.selectOption(type);

        const addButton = within(createFieldForm).getByTestId('addButton');

        // Count fields before adding
        const fieldsBefore = screen.queryAllByText(name).length;

        fireEvent.click(addButton);

        // Wait for the field to be added
        await waitFor(() => {
          expect(screen.queryAllByText(name).length).toBeGreaterThan(fieldsBefore);
        });
      }

      // After adding all fields, wait a bit for form state to stabilize
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    }

    await screen.findByTestId('documentFields');
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());
    fireEvent.click(screen.getByTestId('nextButton'));

    await screen.findByTestId('stepAliases');
  },
  async aliases(aliasesJson?: string) {
    if (aliasesJson) {
      const editor = screen.getByTestId('aliasesEditor');
      fireEvent.change(editor, { target: { value: aliasesJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepReview');
  },
};

describe('<ComponentTemplateCreate />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.spyOn(breadcrumbService, 'setBreadcrumbs');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('On component mount', () => {
    beforeEach(async () => {
      renderComponentTemplateCreate(httpSetup);
      await screen.findByTestId('pageTitle');
    });

    test('updates the breadcrumbs to component templates', () => {
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.componentTemplateCreate
      );
    });

    test('should set the correct page header', async () => {
      // Verify page title
      expect(screen.getByTestId('pageTitle')).toBeInTheDocument();
      expect(screen.getByTestId('pageTitle')).toHaveTextContent('Create component template');

      // Verify documentation link
      expect(screen.getByTestId('documentationLink')).toBeInTheDocument();
      expect(screen.getByTestId('documentationLink')).toHaveTextContent('Component Templates docs');
    });

    describe('Step: Logistics', () => {
      test('should toggle the metadata field', async () => {
        // Meta editor should be hidden by default
        expect(screen.queryByTestId('metaEditor')).not.toBeInTheDocument();

        // Find the switch by test ID and click it directly
        const metaToggle = screen.getByTestId('metaToggle');
        // The switch might be a button or input - try clicking the element directly
        fireEvent.click(metaToggle);

        await screen.findByTestId('metaEditor');
        expect(screen.getByTestId('metaEditor')).toBeInTheDocument();
      });

      test('should toggle the data retention field', async () => {
        expect(screen.queryByTestId('valueDataRetentionField')).not.toBeInTheDocument();

        const lifecycleSwitchRow = screen.getByTestId('dataRetentionToggle');
        const lifecycleSwitch = within(lifecycleSwitchRow).getByRole('switch');
        fireEvent.click(lifecycleSwitch);

        await screen.findByTestId('valueDataRetentionField');
        expect(screen.getByTestId('valueDataRetentionField')).toBeInTheDocument();
      });

      describe('Validation', () => {
        test('should require a name', async () => {
          // Submit logistics step without any values
          fireEvent.click(screen.getByTestId('nextButton'));

          // Wait for validation error
          await screen.findByText('A component template name is required.');
          expect(screen.getByTestId('nextButton')).toBeDisabled();
        });
      });
    });
  });

  describe('Step: Review and submit', () => {
    const COMPONENT_TEMPLATE_NAME = 'comp-1';
    const SETTINGS = { number_of_shards: 1 };
    const ALIASES = { my_alias: {} };
    const LIFECYCLE = {
      enabled: true,
      value: 2,
      unit: 'd',
    };

    const BOOLEAN_MAPPING_FIELD = {
      name: 'boolean_datatype',
      type: 'boolean',
    };

    beforeEach(async () => {
      renderComponentTemplateCreate(httpSetup);
      await screen.findByTestId('pageTitle');

      // Complete step 1 (logistics)
      await completeStep.logistics({
        name: COMPONENT_TEMPLATE_NAME,
        lifecycle: LIFECYCLE,
      });

      // Complete step 2 (index settings)
      await completeStep.settings(JSON.stringify(SETTINGS));

      // Complete step 3 (mappings)
      await completeStep.mappings([BOOLEAN_MAPPING_FIELD]);

      // Complete step 4 (aliases)
      await completeStep.aliases(JSON.stringify(ALIASES));

      // Wait for review step to be fully loaded
      await screen.findByTestId('stepReview');
    });

    test('should render the review content', async () => {
      // Verify page header
      expect(screen.getByTestId('stepReview')).toBeInTheDocument();
      expect(screen.getByTestId('stepReview')).toHaveTextContent(
        `Review details for '${COMPONENT_TEMPLATE_NAME}'`
      );

      // Verify 2 tabs exist
      const reviewContent = screen.getByTestId('stepReview');
      const tabs = within(reviewContent).getAllByRole('tab');
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.textContent)).toEqual(['Summary', 'Request']);

      // Summary tab should render by default
      expect(screen.getByTestId('summaryTab')).toBeInTheDocument();
      expect(screen.queryByTestId('requestTab')).not.toBeInTheDocument();

      // Navigate to request tab and verify content
      fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

      await waitFor(() => {
        expect(screen.queryByTestId('summaryTab')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('requestTab')).toBeInTheDocument();
    });

    test('should send the correct payload when submitting the form', async () => {
      fireEvent.click(screen.getByTestId('nextButton'));

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/component_templates`,
          expect.objectContaining({
            body: JSON.stringify({
              name: COMPONENT_TEMPLATE_NAME,
              template: {
                settings: SETTINGS,
                mappings: {
                  properties: {
                    [BOOLEAN_MAPPING_FIELD.name]: {
                      type: BOOLEAN_MAPPING_FIELD.type,
                    },
                  },
                },
                aliases: ALIASES,
                lifecycle: serializeAsESLifecycle(LIFECYCLE),
              },
              _kbnMeta: { usedBy: [], isManaged: false },
            }),
          })
        );
      });
    });

    test('should surface API errors if the request is unsuccessful', async () => {
      const error = {
        statusCode: 409,
        error: 'Conflict',
        message: `There is already a template with name '${COMPONENT_TEMPLATE_NAME}'`,
      };

      httpRequestsMockHelpers.setCreateComponentTemplateResponse(undefined, error);

      fireEvent.click(screen.getByTestId('nextButton'));

      expect(await screen.findByTestId('saveComponentTemplateError')).toBeInTheDocument();
      expect(screen.getByTestId('saveComponentTemplateError')).toHaveTextContent(error.message);
    });
  });
});
