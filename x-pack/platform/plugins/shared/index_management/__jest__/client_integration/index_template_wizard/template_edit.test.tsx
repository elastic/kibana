/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import * as fixtures from '../../../test/fixtures';
import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment, kibanaVersion, WithAppDependencies } from '../helpers';

import {
  TEMPLATE_NAME,
  SETTINGS,
  ALIASES,
  MAPPINGS as DEFAULT_MAPPING,
  INDEX_PATTERNS,
} from './constants';
import { TemplateEdit } from '../../../public/application/sections/template_edit';

const UPDATED_INDEX_PATTERN = ['updatedIndexPattern'];
const UPDATED_MAPPING_TEXT_FIELD_NAME = 'updated_text_datatype';
const MAPPING = {
  ...DEFAULT_MAPPING,
  properties: {
    text_datatype: {
      type: 'text',
    },
  },
};
const NONEXISTENT_COMPONENT_TEMPLATE = {
  name: 'component_template@custom',
  hasMappings: false,
  hasAliases: false,
  hasSettings: false,
  usedBy: [],
};

const EXISTING_COMPONENT_TEMPLATE = {
  name: 'test_component_template',
  hasMappings: true,
  hasAliases: false,
  hasSettings: false,
  usedBy: [],
  isManaged: false,
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

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj="mockComboBox"
        onChange={(syntheticEvent: React.ChangeEvent<HTMLInputElement>) => {
          // RTL fireEvent creates DOM event with target.value
          props.onChange([
            { label: syntheticEvent.target.value, value: syntheticEvent.target.value },
          ]);
        }}
      />
    ),
  };
});

/**
 * Helper to render TemplateEdit component with routing (RTL).
 */
const renderTemplateEdit = (httpSetup: any, templateName: string = TEMPLATE_NAME) => {
  const EditWithRouter = () => (
    <MemoryRouter initialEntries={[`/edit_template/${templateName}`]}>
      <Route path="/edit_template/:name" component={TemplateEdit} />
    </MemoryRouter>
  );

  return render(React.createElement(WithAppDependencies(EditWithRouter, httpSetup)));
};

/**
 * Helper to fill form step-by-step.
 */
const completeStep = {
  async one({ indexPatterns, priority, allowAutoCreate, version, lifecycle }: any = {}) {
    if (indexPatterns) {
      const combobox = screen.getByTestId('mockComboBox');
      indexPatterns.forEach((pattern: string) => {
        fireEvent.change(combobox, { target: { value: pattern } });
      });
    }

    if (priority !== undefined) {
      const priorityRow = screen.getByTestId('priorityField');
      const priorityInput = within(priorityRow).getByRole('spinbutton');
      fireEvent.change(priorityInput, { target: { value: String(priority) } });
    }

    if (version !== undefined) {
      const versionRow = screen.getByTestId('versionField');
      const versionInput = within(versionRow).getByRole('spinbutton');
      fireEvent.change(versionInput, { target: { value: String(version) } });
    }

    if (lifecycle) {
      const lifecycleSwitchRow = screen.getByTestId('dataRetentionToggle');
      const lifecycleSwitch = within(lifecycleSwitchRow).getByRole('switch');
      fireEvent.click(lifecycleSwitch);

      await screen.findByTestId('valueDataRetentionField');

      const retentionInput = screen.getByTestId('valueDataRetentionField');
      fireEvent.change(retentionInput, { target: { value: String(lifecycle.value) } });
    }

    if (allowAutoCreate) {
      const autoCreateRow = screen.getByTestId('allowAutoCreateField');

      let labelMatch = /Do not overwrite/;
      if (allowAutoCreate === 'TRUE') labelMatch = /True/;
      if (allowAutoCreate === 'FALSE') labelMatch = /False/;

      const radio = within(autoCreateRow).getByLabelText(labelMatch);
      fireEvent.click(radio);
    }

    fireEvent.click(screen.getByTestId('nextButton'));
    jest.advanceTimersByTime(0);
    await screen.findByTestId('stepComponents');
  },
  async two() {
    fireEvent.click(screen.getByTestId('nextButton'));
    jest.advanceTimersByTime(0);
    await screen.findByTestId('stepSettings');
  },
  async three(settingsJson?: string) {
    if (settingsJson) {
      const editor = screen.getByTestId('settingsEditor');
      fireEvent.change(editor, { target: { value: settingsJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    jest.advanceTimersByTime(0);
    await screen.findByTestId('stepMappings');
  },
  async four() {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await screen.findByTestId('documentFields');
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());
    await user.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepAliases');
  },
  async five(aliasesJson?: string) {
    if (aliasesJson) {
      const editor = screen.getByTestId('aliasesEditor');
      fireEvent.change(editor, { target: { value: aliasesJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    jest.advanceTimersByTime(0);
    await screen.findByTestId('summaryTabContent');
  },
};

describe('<TemplateEdit />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([EXISTING_COMPONENT_TEMPLATE]);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('without mappings', () => {
    const templateToEdit = fixtures.getTemplate({
      name: 'index_template_without_mappings',
      indexPatterns: ['indexPattern1'],
      dataStream: {
        hidden: true,
        anyUnknownKey: 'should_be_kept',
      },
    });

    beforeAll(() => {
      httpRequestsMockHelpers.setLoadTemplateResponse('my_template', templateToEdit);
    });

    beforeEach(async () => {
      // Clear mocks per Pattern 20 (Test Isolation)
      httpSetup.get.mockClear();
      httpSetup.put.mockClear();

      renderTemplateEdit(httpSetup);

      // Pattern 4: Wait for element to APPEAR (page loaded)
      await screen.findByTestId('pageTitle');
    });

    test('allows you to add mappings', async () => {
      // Navigate to mappings step
      await completeStep.one();
      await completeStep.two();
      await completeStep.three();

      // Now on mappings step - add a field
      const nameInput = screen.getByTestId('nameParameterInput');
      fireEvent.change(nameInput, { target: { value: 'field_1' } });

      const typeCombobox = within(screen.getByTestId('createFieldForm')).getByTestId(
        'mockComboBox'
      );
      fireEvent.change(typeCombobox, { target: { value: 'text' } });

      fireEvent.click(screen.getByTestId('addButton'));
      jest.advanceTimersByTime(0);

      // Wait for field to appear in list
      await waitFor(() => {
        expect(screen.getAllByTestId(/fieldsListItem/)).toHaveLength(1);
      });
    });

    test('should keep data stream configuration', async () => {
      // Fill logistics step with lifecycle
      await completeStep.one({ version: 1, lifecycle: { value: 1, unit: 'd' } });

      // Complete remaining steps
      await completeStep.two();
      await completeStep.three();
      await completeStep.four();
      await completeStep.five();

      // Submit form
      fireEvent.click(screen.getByTestId('nextButton'));

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/index_templates/${templateToEdit.name}`,
          expect.objectContaining({
            body: JSON.stringify({
              name: templateToEdit.name,
              indexPatterns: templateToEdit.indexPatterns,
              version: 1,
              allowAutoCreate: 'NO_OVERWRITE',
              dataStream: {
                hidden: true,
                anyUnknownKey: 'should_be_kept',
              },
              indexMode: 'standard',
              _kbnMeta: {
                type: 'default',
                hasDatastream: true,
                isLegacy: false,
              },
              template: {
                lifecycle: {
                  enabled: true,
                  data_retention: '1d',
                },
              },
            }),
          })
        );
      });
    });
  });

  describe('with mappings', () => {
    const templateToEdit = fixtures.getTemplate({
      name: TEMPLATE_NAME,
      indexPatterns: ['indexPattern1'],
      template: {
        mappings: MAPPING,
      },
    });

    beforeAll(() => {
      httpRequestsMockHelpers.setLoadTemplateResponse('my_template', templateToEdit);
    });

    beforeEach(async () => {
      // Clear mocks per Pattern 20 (Test Isolation)
      httpSetup.get.mockClear();
      httpSetup.put.mockClear();

      renderTemplateEdit(httpSetup);

      // Pattern 4: Wait for element to APPEAR (page loaded)
      await screen.findByTestId('pageTitle');
    });

    test('should set the correct page title', () => {
      const { name } = templateToEdit;

      expect(screen.getByTestId('pageTitle')).toBeInTheDocument();
      expect(screen.getByTestId('pageTitle')).toHaveTextContent(`Edit template '${name}'`);
    });

    it('should set the nameField to readOnly', () => {
      const nameRow = screen.getByTestId('nameField');
      const nameInput = within(nameRow).getByRole('textbox');
      expect(nameInput).toBeDisabled();
    });

    describe('form payload', () => {
      beforeEach(async () => {
        // Complete all steps up to mappings
        await completeStep.one({
          indexPatterns: UPDATED_INDEX_PATTERN,
          priority: 3,
          allowAutoCreate: 'TRUE',
        });
        await completeStep.two();
        await completeStep.three(JSON.stringify(SETTINGS));
      });

      it('should send the correct payload with changed values', async () => {
        // Now on mappings step - edit the first field
        const editButtons = screen.getAllByTestId('editFieldButton');
        fireEvent.click(editButtons[0]);

        // Wait for flyout to open
        await screen.findByTestId('mappingsEditorFieldEdit');

        // Change field name
        const nameInput = screen.getByTestId('nameParameterInput');
        fireEvent.change(nameInput, { target: { value: UPDATED_MAPPING_TEXT_FIELD_NAME } });

        // Save changes
        fireEvent.click(screen.getByTestId('editFieldUpdateButton'));

        // Wait for flyout to close
        await waitFor(() => {
          expect(screen.queryByTestId('mappingsEditorFieldEdit')).not.toBeInTheDocument();
        });

        // Complete remaining steps
        await completeStep.four();
        await completeStep.five(JSON.stringify(ALIASES));

        // Submit the form
        fireEvent.click(screen.getByTestId('nextButton'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`,
            expect.objectContaining({
              body: JSON.stringify({
                name: TEMPLATE_NAME,
                indexPatterns: UPDATED_INDEX_PATTERN,
                priority: 3,
                version: templateToEdit.version,
                allowAutoCreate: 'TRUE',
                indexMode: 'standard',
                _kbnMeta: {
                  type: 'default',
                  hasDatastream: false,
                  isLegacy: templateToEdit._kbnMeta.isLegacy,
                },
                template: {
                  settings: SETTINGS,
                  mappings: {
                    properties: {
                      [UPDATED_MAPPING_TEXT_FIELD_NAME]: {
                        type: 'text',
                        index: true,
                        eager_global_ordinals: false,
                        index_phrases: false,
                        norms: true,
                        fielddata: false,
                        store: false,
                        index_options: 'positions',
                      },
                    },
                  },
                  aliases: ALIASES,
                },
              }),
            })
          );
        });
      });
    });
  });

  describe('when composed of a nonexistent component template', () => {
    const templateToEdit = fixtures.getTemplate({
      name: TEMPLATE_NAME,
      indexPatterns: INDEX_PATTERNS,
      composedOf: [NONEXISTENT_COMPONENT_TEMPLATE.name],
      ignoreMissingComponentTemplates: [NONEXISTENT_COMPONENT_TEMPLATE.name],
    });

    beforeAll(() => {
      httpRequestsMockHelpers.setLoadTemplateResponse('my_template', templateToEdit);
    });

    beforeEach(async () => {
      // Clear mocks per Pattern 20 (Test Isolation)
      httpSetup.get.mockClear();
      httpSetup.put.mockClear();

      renderTemplateEdit(httpSetup);

      // Pattern 4: Wait for element to APPEAR (page loaded)
      await screen.findByTestId('pageTitle');
    });

    it('the nonexistent component template should be selected in the Component templates selector', async () => {
      // Complete step 1: Logistics
      await completeStep.one();

      // Verify nonexistent template is selected
      expect(
        screen.queryByTestId('componentTemplatesSelection.emptyPrompt')
      ).not.toBeInTheDocument();

      const selectedList = screen.getByTestId('componentTemplatesSelection');
      const selectedTemplates = within(selectedList).getAllByTestId('name');
      expect(selectedTemplates).toHaveLength(1);
      expect(selectedTemplates[0]).toHaveTextContent(NONEXISTENT_COMPONENT_TEMPLATE.name);
    });

    it('the composedOf and ignoreMissingComponentTemplates fields should be included in the final payload', async () => {
      // Complete all steps
      await completeStep.one();
      await completeStep.two();
      await completeStep.three();
      await completeStep.four();
      await completeStep.five();

      expect(screen.getByTestId('stepTitle')).toHaveTextContent(
        `Review details for '${TEMPLATE_NAME}'`
      );

      // Submit form
      fireEvent.click(screen.getByTestId('nextButton'));

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`,
          expect.objectContaining({
            body: JSON.stringify({
              name: TEMPLATE_NAME,
              indexPatterns: INDEX_PATTERNS,
              version: templateToEdit.version,
              allowAutoCreate: templateToEdit.allowAutoCreate,
              indexMode: templateToEdit.indexMode,
              _kbnMeta: templateToEdit._kbnMeta,
              composedOf: [NONEXISTENT_COMPONENT_TEMPLATE.name],
              template: {},
              ignoreMissingComponentTemplates: [NONEXISTENT_COMPONENT_TEMPLATE.name],
            }),
          })
        );
      });
    });
  });

  if (kibanaVersion.major < 8) {
    describe('legacy index templates', () => {
      const legacyTemplateToEdit = fixtures.getTemplate({
        name: 'legacy_index_template',
        indexPatterns: ['indexPattern1'],
        isLegacy: true,
        template: {
          mappings: {
            my_mapping_type: {},
          },
        },
      });

      beforeAll(() => {
        httpRequestsMockHelpers.setLoadTemplateResponse('my_template', legacyTemplateToEdit);
      });

      beforeEach(async () => {
        // Clear mocks per Pattern 20 (Test Isolation)
        httpSetup.get.mockClear();
        httpSetup.put.mockClear();

        renderTemplateEdit(httpSetup, legacyTemplateToEdit.name);

        // Pattern 4: Wait for element to APPEAR (page loaded)
        await screen.findByTestId('pageTitle');
      });

      it('persists mappings type', async () => {
        // Complete all steps (note: step 2 - component templates doesn't exist for legacy)
        await completeStep.one();

        // For legacy templates, step 2 (component templates) doesn't exist, so we go directly to settings (step 3)
        await completeStep.three();
        await completeStep.four();
        await completeStep.five();

        // Submit the form
        fireEvent.click(screen.getByTestId('nextButton'));

        const { version, template, name, indexPatterns, _kbnMeta, order } = legacyTemplateToEdit;

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`,
            expect.objectContaining({
              body: JSON.stringify({
                name,
                indexPatterns,
                version,
                order,
                template: {
                  aliases: undefined,
                  mappings: template!.mappings,
                  settings: undefined,
                },
                _kbnMeta,
              }),
            })
          );
        });
      });
    });
  }
});
