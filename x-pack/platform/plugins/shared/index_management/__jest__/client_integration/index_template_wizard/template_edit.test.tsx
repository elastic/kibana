/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';

import * as fixtures from '../../../test/fixtures';
import { API_BASE_PATH } from '../../../common/constants';

import { TEMPLATE_NAME, SETTINGS, ALIASES, INDEX_PATTERNS } from './constants';
import { kibanaVersion, setupEnvironment } from '../helpers/setup_environment';
import {
  EXISTING_COMPONENT_TEMPLATE,
  MAPPING,
  NONEXISTENT_COMPONENT_TEMPLATE,
  UPDATED_INDEX_PATTERN,
  UPDATED_MAPPING_TEXT_FIELD_NAME,
  completeStep,
  renderTemplateEdit,
} from './template_edit.helpers';

jest.mock('@kbn/code-editor');

describe('<TemplateEdit />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([EXISTING_COMPONENT_TEMPLATE]);
  });

  // FLAKY: https://github.com/elastic/kibana/issues/253550
  describe.skip('without mappings', () => {
    const templateToEdit = fixtures.getTemplate({
      name: 'index_template_without_mappings',
      indexPatterns: ['indexPattern1'],
      dataStream: {
        hidden: true,
        anyUnknownKey: 'should_be_kept',
      },
    });

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadTemplateResponse('my_template', templateToEdit);
      renderTemplateEdit(httpSetup);

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

      const createFieldForm = screen.getByTestId('createFieldForm');
      await within(createFieldForm).findByTestId('fieldType');
      const fieldTypeComboBox = new EuiComboBoxTestHarness('fieldType');
      await fieldTypeComboBox.select('text');
      // Close the combobox popover (portal) so it doesn't leak across tests.
      await fieldTypeComboBox.close();

      fireEvent.click(screen.getByTestId('addButton'));

      await waitFor(() => {
        expect(screen.getAllByTestId(/fieldsListItem/)).toHaveLength(1);
      });
    }, 7500);

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

    beforeEach(async () => {
      jest.clearAllMocks();
      httpRequestsMockHelpers.setLoadTemplateResponse('my_template', templateToEdit);

      renderTemplateEdit(httpSetup);

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
      }, 20000);

      it('should send the correct payload with changed values', async () => {
        // Now on mappings step - edit the text_datatype field (avoid "first item wins")
        const fieldItem = screen.getByTestId(
          (content) => content.startsWith('fieldsListItem ') && content.includes('text_datatype')
        );
        fireEvent.click(within(fieldItem).getByTestId('editFieldButton'));

        await screen.findByTestId('mappingsEditorFieldEdit');

        // Change field name
        const nameInput = screen.getByTestId('nameParameterInput');
        fireEvent.change(nameInput, { target: { value: UPDATED_MAPPING_TEXT_FIELD_NAME } });

        // Save changes
        fireEvent.click(screen.getByTestId('editFieldUpdateButton'));

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
      }, 6000);
    });
  });

  describe('when composed of a nonexistent component template', () => {
    const templateToEdit = fixtures.getTemplate({
      name: TEMPLATE_NAME,
      indexPatterns: INDEX_PATTERNS,
      composedOf: [NONEXISTENT_COMPONENT_TEMPLATE.name],
      ignoreMissingComponentTemplates: [NONEXISTENT_COMPONENT_TEMPLATE.name],
    });

    beforeEach(async () => {
      jest.clearAllMocks();

      httpRequestsMockHelpers.setLoadTemplateResponse('my_template', templateToEdit);
      renderTemplateEdit(httpSetup);

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
      const selectedTemplate = within(selectedList).getByTestId('name');
      expect(selectedTemplate).toHaveTextContent(NONEXISTENT_COMPONENT_TEMPLATE.name);
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

      beforeEach(async () => {
        httpSetup.get.mockClear();
        httpSetup.put.mockClear();

        httpRequestsMockHelpers.setLoadTemplateResponse('my_template', legacyTemplateToEdit);

        renderTemplateEdit(httpSetup, legacyTemplateToEdit.name);

        await screen.findByTestId('pageTitle');
      });

      it('persists mappings type', async () => {
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
