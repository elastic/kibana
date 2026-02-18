/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiComboBoxTestHarness, EuiSuperSelectTestHarness } from '@kbn/test-eui-helpers';

import { WithAppDependencies } from './helpers/setup_environment';
import { MappingsEditor } from '../../mappings_editor';
import { TYPE_DEFINITION } from '../../constants';
import type { AppDependencies } from '../../../..';

// Helper to map type values to their display labels
const getTypeLabel = (typeValue: string): string => {
  const typeDef = TYPE_DEFINITION[typeValue as keyof typeof TYPE_DEFINITION];
  return typeDef?.label || typeValue;
};

jest.mock('../../../component_templates/component_templates_context', () => ({
  useComponentTemplatesContext: jest.fn().mockReturnValue({
    toasts: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
    },
  }),
}));

describe('Mappings editor: core', () => {
  interface TestMappings {
    dynamic?: boolean;
    numeric_detection?: boolean;
    date_detection?: boolean;
    properties?: Record<string, Record<string, unknown>>;
    dynamic_templates?: unknown[];
    _source?: { enabled?: boolean; includes?: string[]; excludes?: string[] };
    _meta?: Record<string, unknown>;
    _routing?: { required?: boolean };
    [key: string]: unknown;
  }

  let data: TestMappings | undefined;
  let onChangeHandler: jest.Mock = jest.fn();

  const appDependencies = {
    core: { application: {}, http: {} },
    services: {
      notificationService: { toasts: {} },
    },
    docLinks: {
      links: {
        inferenceManagement: {
          inferenceAPIDocumentation: 'https://abc.com/inference-api-create',
        },
      },
    },
    plugins: {
      ml: { mlApi: {} },
    },
  } as unknown as Partial<AppDependencies>;

  type MappingsEditorProps = ComponentProps<typeof MappingsEditor>;

  const setup = (props: Partial<MappingsEditorProps>, ctx: unknown = appDependencies) => {
    const Component = WithAppDependencies(MappingsEditor, ctx);
    return render(
      <I18nProvider>
        <Component {...props} />
      </I18nProvider>
    );
  };

  const selectTab = async (tabName: string) => {
    const tabMap: Record<string, string> = {
      fields: 'Mapped fields',
      runtimeFields: 'Runtime fields',
      templates: 'Dynamic templates',
      advanced: 'Advanced options',
    };
    const tab = screen.getByRole('tab', { name: tabMap[tabName] });
    fireEvent.click(tab);
    await waitFor(() => expect(tab).toHaveAttribute('aria-selected', 'true'));
  };

  const addField = async (
    name: string,
    type: string,
    subType?: string,
    referenceField?: string
  ) => {
    // Fill name
    const nameInput = screen.getByTestId('nameParameterInput');
    fireEvent.change(nameInput, { target: { value: name } });

    // Select type using EuiComboBox harness - use label, not value
    const typeComboBox = new EuiComboBoxTestHarness('fieldType');
    await typeComboBox.select(getTypeLabel(type));
    // Close the combobox popover (portal) so it can't intercept later clicks/keystrokes.
    await typeComboBox.close();

    if (subType !== undefined && type === 'other') {
      const subTypeInput = await screen.findByTestId('fieldSubType');
      fireEvent.change(subTypeInput, { target: { value: subType } });
    }

    if (referenceField !== undefined) {
      // Wait for reference field to appear after semantic_text type is selected
      await screen.findByTestId('referenceFieldSelect');

      const referenceSelect = new EuiSuperSelectTestHarness('referenceFieldSelect');
      await referenceSelect.select(`select-reference-field-${referenceField}`);
    }

    const addButton = screen.getByTestId('addButton');
    fireEvent.click(addButton);

    await waitFor(() => {
      const documentFields = screen.getByTestId('documentFields');
      const listItems = within(documentFields).getAllByTestId((content) =>
        content.startsWith('fieldsListItem ')
      );
      const found = listItems.some((it) => {
        const fieldNameEls = within(it).queryAllByTestId(/fieldName/);
        return fieldNameEls.some((el) => {
          if ((el.textContent || '').trim() !== name) return false;

          let node: HTMLElement | null = el as HTMLElement;
          while (node && node !== it) {
            const subj = node.getAttribute('data-test-subj');
            if (typeof subj === 'string' && subj.startsWith('fieldsListItem ')) return false;
            node = node.parentElement;
          }

          return true;
        });
      });
      expect(found).toBe(true);
    });

    const cancelButton = await screen.findByTestId('cancelButton');
    fireEvent.click(cancelButton);

    await waitFor(() => expect(screen.queryByTestId('createFieldForm')).not.toBeInTheDocument());
  };

  const updateJsonEditor = (testSubj: string, value: object) => {
    // Strip prefix - form doesn't create hierarchical test subjects
    const actualTestSubj = testSubj.replace(/^advancedConfiguration\./, '');
    const editor = screen.getByTestId(actualTestSubj);
    fireEvent.change(editor, { target: { value: JSON.stringify(value) } });
  };

  const getJsonEditorValue = (testSubj: string) => {
    // Strip prefix - form doesn't create hierarchical test subjects
    const actualTestSubj = testSubj.replace(/^advancedConfiguration\./, '');
    const editor = screen.getByTestId(actualTestSubj);
    const attributeValue = editor.getAttribute('data-currentvalue');
    const inputValue = (editor as HTMLInputElement).value;
    const value = typeof attributeValue === 'string' ? attributeValue : inputValue;

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return { errorParsingJson: true };
      }
    }
    return value;
  };

  const getToggleValue = (testSubj: string): boolean => {
    // Strip 'advancedConfiguration.' prefix if present - form doesn't create hierarchical test subjects
    const actualTestSubj = testSubj.replace(/^advancedConfiguration\./, '');

    // Handle hierarchical test subjects like 'dynamicMappingsToggle.input'
    if (actualTestSubj.includes('.')) {
      const [formRowId, inputId] = actualTestSubj.split('.');
      const formRow = screen.getByTestId(formRowId);
      const toggle = within(formRow).getByTestId(inputId);
      return toggle.getAttribute('aria-checked') === 'true';
    }

    const toggle = screen.getByTestId(actualTestSubj);
    return toggle.getAttribute('aria-checked') === 'true';
  };

  const getComboBoxValue = (testSubj: string) => {
    // Strip prefixes - sourceField is not hierarchical in DOM
    const actualTestSubj = testSubj.replace(/^(advancedConfiguration|sourceField)\./, '');
    const comboBoxContainer = screen.getByTestId(actualTestSubj);

    // Real EuiComboBox renders selected options as pills with data-test-subj="euiComboBoxPill"
    const pills = within(comboBoxContainer).queryAllByTestId('euiComboBoxPill');
    return pills.map((pill) => pill.textContent || '');
  };

  const toggleEuiSwitch = async (testSubj: string) => {
    // Strip prefix - form doesn't create hierarchical test subjects
    const actualTestSubj = testSubj.replace(/^advancedConfiguration\./, '');

    // Handle hierarchical test subjects like 'dynamicMappingsToggle.input'
    let toggle;
    if (actualTestSubj.includes('.')) {
      const [formRowId, inputId] = actualTestSubj.split('.');
      const formRow = screen.getByTestId(formRowId);
      toggle = within(formRow).getByTestId(inputId);
    } else {
      toggle = screen.getByTestId(actualTestSubj);
    }

    fireEvent.click(toggle);
    await waitFor(() => {
      const newState = toggle.getAttribute('aria-checked');
      expect(newState).toBeDefined();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onChangeHandler = jest.fn();
  });

  test('default behaviour', async () => {
    const defaultMappings = {
      properties: {
        user: {
          // No type defined for user
          properties: {
            name: { type: 'text' },
          },
        },
      },
    };

    setup({ value: defaultMappings, onChange: onChangeHandler });

    await screen.findByTestId('mappingsEditor');

    const expectedMappings = {
      ...defaultMappings,
      properties: {
        user: {
          type: 'object', // Was not defined so it defaults to "object" type
          ...defaultMappings.properties.user,
        },
      },
    };

    // Verify onChange was called with expected mappings
    expect(onChangeHandler).toHaveBeenCalled();
    const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
    data = lastCall.getData(lastCall.isValid ?? true);
    expect(data).toEqual(expectedMappings);
  });

  describe('multiple mappings detection', () => {
    test('should show a warning when multiple mappings are detected', async () => {
      const value = {
        type1: {
          properties: {
            name1: {
              type: 'keyword',
            },
          },
        },
        type2: {
          properties: {
            name2: {
              type: 'keyword',
            },
          },
        },
      };

      setup({ onChange: onChangeHandler, value });

      await screen.findByTestId('mappingsEditor');

      expect(screen.getByTestId('mappingTypesDetectedCallout')).toBeInTheDocument();
      expect(screen.queryByTestId('documentFields')).not.toBeInTheDocument();
    });

    test('should not show a warning when mappings a single-type', async () => {
      const value = {
        properties: {
          name1: {
            type: 'keyword',
          },
        },
      };

      setup({ onChange: onChangeHandler, value });

      await screen.findByTestId('mappingsEditor');

      expect(screen.queryByTestId('mappingTypesDetectedCallout')).not.toBeInTheDocument();
      expect(screen.getByTestId('documentFields')).toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    const defaultMappings = {
      properties: {},
      dynamic_templates: [{ before: 'foo' }],
    };

    const ctx = {
      config: {
        enableMappingsSourceFieldSection: true,
      },
      ...appDependencies,
    };

    test('should have 4 tabs (fields, runtime, template, advanced settings)', async () => {
      setup({ value: defaultMappings, onChange: onChangeHandler }, ctx);
      await screen.findByTestId('mappingsEditor');

      const tabs = screen.getAllByRole('tab');
      const tabTexts = tabs.map((tab) => tab.textContent);

      expect(tabTexts).toEqual([
        'Mapped fields',
        'Runtime fields',
        'Dynamic templates',
        'Advanced options',
      ]);
    });

    test('should keep the changes when switching tabs', async () => {
      setup({ value: defaultMappings, onChange: onChangeHandler }, ctx);
      await screen.findByTestId('mappingsEditor');

      // Start with empty fields list
      const fieldsListItems = screen.queryAllByTestId('fieldsListItem');
      expect(fieldsListItems).toHaveLength(0);

      // Add a new field
      const addFieldButton = screen.getByTestId('addFieldButton');
      fireEvent.click(addFieldButton);

      await screen.findByTestId('createFieldForm');

      const newField = { name: 'John', type: 'text' };
      await addField(newField.name, newField.type);

      // Verify field was added
      await waitFor(() => {
        const items = screen.getAllByTestId(/^fieldsListItem/);
        expect(items).toHaveLength(1);
      });

      await waitFor(() => {
        const documentFields = screen.getByTestId('documentFields');
        const listItems = within(documentFields).getAllByTestId((content) =>
          content.startsWith('fieldsListItem ')
        );
        const found = listItems.some((it) => {
          const fieldNameEls = within(it).queryAllByTestId(/fieldName/);
          return fieldNameEls.some((el) => {
            if ((el.textContent || '').trim() !== newField.name) return false;

            let node: HTMLElement | null = el as HTMLElement;
            while (node && node !== it) {
              const subj = node.getAttribute('data-test-subj');
              if (typeof subj === 'string' && subj.startsWith('fieldsListItem ')) return false;
              node = node.parentElement;
            }

            return true;
          });
        });
        expect(found).toBe(true);
      });

      // Navigate to dynamic templates tab
      await selectTab('templates');

      let templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(defaultMappings.dynamic_templates);

      // Update the dynamic templates editor value
      const updatedValueTemplates = [{ after: 'bar' }];
      updateJsonEditor('dynamicTemplatesEditor', updatedValueTemplates);

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);

      // Switch to advanced settings tab and make some changes
      await selectTab('advanced');

      let isDynamicMappingsEnabled = getToggleValue(
        'advancedConfiguration.dynamicMappingsToggle.input'
      );
      expect(isDynamicMappingsEnabled).toBe(true);

      let isNumericDetectionVisible = screen.queryByTestId('numericDetection');
      expect(isNumericDetectionVisible).toBeInTheDocument();

      // Turn off dynamic mappings
      await toggleEuiSwitch('advancedConfiguration.dynamicMappingsToggle.input');

      isDynamicMappingsEnabled = getToggleValue(
        'advancedConfiguration.dynamicMappingsToggle.input'
      );
      expect(isDynamicMappingsEnabled).toBe(false);

      isNumericDetectionVisible = screen.queryByTestId('numericDetection');
      expect(isNumericDetectionVisible).not.toBeInTheDocument();

      // Go back to dynamic templates tab and make sure our changes are still there
      await selectTab('templates');

      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual(updatedValueTemplates);

      // Go back to fields and make sure our created field is there
      await selectTab('fields');

      await waitFor(() => {
        const documentFields = screen.getByTestId('documentFields');
        const listItems = within(documentFields).getAllByTestId((content) =>
          content.startsWith('fieldsListItem ')
        );
        const found = listItems.some((it) => {
          const fieldNameEls = within(it).queryAllByTestId(/fieldName/);
          return fieldNameEls.some((el) => {
            if ((el.textContent || '').trim() !== newField.name) return false;

            let node: HTMLElement | null = el as HTMLElement;
            while (node && node !== it) {
              const subj = node.getAttribute('data-test-subj');
              if (typeof subj === 'string' && subj.startsWith('fieldsListItem ')) return false;
              node = node.parentElement;
            }

            return true;
          });
        });
        expect(found).toBe(true);
      });

      // Go back to advanced settings tab make sure dynamic mappings is disabled
      await selectTab('advanced');

      isDynamicMappingsEnabled = getToggleValue(
        'advancedConfiguration.dynamicMappingsToggle.input'
      );
      expect(isDynamicMappingsEnabled).toBe(false);
      isNumericDetectionVisible = screen.queryByTestId('numericDetection');
      expect(isNumericDetectionVisible).not.toBeInTheDocument();
    }, 10000);

    test('should keep default dynamic templates value when switching tabs', async () => {
      setup(
        {
          value: { ...defaultMappings, dynamic_templates: [] }, // by default, the UI will provide an empty array for dynamic templates
          onChange: onChangeHandler,
        },
        ctx
      );

      await screen.findByTestId('mappingsEditor');

      // Navigate to dynamic templates tab and verify empty array
      await selectTab('templates');
      let templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual([]);

      // Navigate to advanced tab
      await selectTab('advanced');

      // Navigate back to dynamic templates tab and verify empty array persists
      await selectTab('templates');
      templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
      expect(templatesValue).toEqual([]);
    });
  });

  describe('component props', () => {
    /**
     * Note: the "indexSettings" prop will be tested along with the "analyzer" parameter on a text datatype field,
     * as it is the only place where it is consumed by the mappings editor.
     * The test that covers it is in the "text_datatype.test.tsx": "analyzer parameter: custom analyzer (from index settings)"
     */
    let defaultMappings: TestMappings;

    const ctx = {
      config: {
        enableMappingsSourceFieldSection: true,
      },
      canUseSyntheticSource: true,
      ...appDependencies,
    };

    beforeEach(() => {
      defaultMappings = {
        dynamic: true,
        numeric_detection: false,
        date_detection: true,
        properties: {
          title: { type: 'text' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'text' },
              city: { type: 'text' },
            },
          },
        },
        dynamic_templates: [{ initial: 'value' }],
        _source: {
          enabled: true,
          includes: ['field1', 'field2'],
          excludes: ['field3'],
        },
        _meta: {
          some: 'metaData',
        },
        _routing: {
          required: false,
        },
        subobjects: true,
      };
    });

    // FLAKY: https://github.com/elastic/kibana/issues/253428
    describe.skip('props.value and props.onChange', () => {
      beforeEach(async () => {
        setup({ value: defaultMappings, onChange: onChangeHandler }, ctx);
        await screen.findByTestId('mappingsEditor');
      });

      test('props.value => should prepopulate the editor data', async () => {
        // Mapped fields
        // Test that root-level mappings "properties" are rendered as root-level "DOM tree items"
        const fieldElements = screen.getAllByTestId(/^fieldsListItem/);
        const fields = fieldElements.map((el) => within(el).getByTestId(/fieldName/).textContent);
        expect(fields.sort()).toEqual(Object.keys(defaultMappings.properties!).sort());

        // Dynamic templates
        await selectTab('templates');

        // Test that dynamic templates JSON is rendered in the templates editor
        const templatesValue = getJsonEditorValue('dynamicTemplatesEditor');
        expect(templatesValue).toEqual(defaultMappings.dynamic_templates);

        // Advanced settings
        await selectTab('advanced');

        const isDynamicMappingsEnabled = getToggleValue(
          'advancedConfiguration.dynamicMappingsToggle.input'
        );
        expect(isDynamicMappingsEnabled).toBe(defaultMappings.dynamic);

        const isNumericDetectionEnabled = getToggleValue(
          'advancedConfiguration.numericDetection.input'
        );
        expect(isNumericDetectionEnabled).toBe(defaultMappings.numeric_detection);

        expect(getComboBoxValue('sourceField.includesField')).toEqual(
          defaultMappings._source!.includes
        );
        expect(getComboBoxValue('sourceField.excludesField')).toEqual(
          defaultMappings._source!.excludes
        );

        const metaFieldValue = getJsonEditorValue('advancedConfiguration.metaField');
        expect(metaFieldValue).toEqual(defaultMappings._meta);

        const isRoutingRequired = getToggleValue(
          'advancedConfiguration.routingRequiredToggle.input'
        );
        expect(isRoutingRequired).toBe(defaultMappings._routing!.required);
      });

      test('props.onChange() => should forward the changes to the consumer component', async () => {
        let updatedMappings = { ...defaultMappings };

        // Mapped fields
        const addFieldButton = screen.getByTestId('addFieldButton');
        fireEvent.click(addFieldButton);

        await screen.findByTestId('createFieldForm');

        const newField = { name: 'someNewField', type: 'text' };
        await addField(newField.name, newField.type);

        updatedMappings = {
          ...updatedMappings,
          properties: {
            ...updatedMappings.properties,
            [newField.name]: { type: 'text' },
          },
        };

        await waitFor(() => {
          expect(onChangeHandler).toHaveBeenCalled();
          const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
          data = lastCall.getData(lastCall.isValid ?? true);
          expect(data).toEqual(updatedMappings);
        });

        // Dynamic templates
        await selectTab('templates');

        const updatedTemplatesValue = [{ someTemplateProp: 'updated' }];
        updatedMappings = {
          ...updatedMappings,
          dynamic_templates: updatedTemplatesValue,
        };

        updateJsonEditor('dynamicTemplatesEditor', updatedTemplatesValue);

        await waitFor(() => {
          const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
          data = lastCall.getData(lastCall.isValid ?? true);
          expect(data).toEqual(updatedMappings);
        });

        // Advanced settings
        await selectTab('advanced');

        // Disable dynamic mappings
        await toggleEuiSwitch('advancedConfiguration.dynamicMappingsToggle.input');

        await waitFor(() => {
          const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
          data = lastCall.getData(lastCall.isValid ?? true);

          // When we disable dynamic mappings, we set it to "false" and remove date and numeric detections
          updatedMappings = {
            ...updatedMappings,
            dynamic: false,
            // The "enabled": true is removed as this is the default in Es
            _source: {
              includes: defaultMappings._source!.includes,
              excludes: defaultMappings._source!.excludes,
            },
          };
          delete updatedMappings.date_detection;
          delete updatedMappings.dynamic_date_formats;
          delete updatedMappings.numeric_detection;

          expect(data).toEqual(updatedMappings);
        });
      });
    }); // Close inner describe for props.value and props.onChange

    describe('semantic_text field tests', () => {
      beforeEach(async () => {
        setup({ value: defaultMappings, onChange: onChangeHandler }, ctx);
        await screen.findByTestId('mappingsEditor');
      });

      test('updates mapping without inference id for semantic_text field', async () => {
        let updatedMappings = { ...defaultMappings };

        // Mapped fields
        const addFieldButton = screen.getByTestId('addFieldButton');
        fireEvent.click(addFieldButton);

        await screen.findByTestId('createFieldForm');

        const newField = { name: 'someNewField', type: 'semantic_text' };
        await addField(newField.name, newField.type);

        updatedMappings = {
          ...updatedMappings,
          properties: {
            ...updatedMappings.properties,
            [newField.name]: { reference_field: '', type: 'semantic_text' },
          },
        };

        await waitFor(() => {
          expect(onChangeHandler).toHaveBeenCalled();
          const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
          data = lastCall.getData(lastCall.isValid ?? true);
          expect(data).toEqual(updatedMappings);
        });
      });

      test('updates mapping with reference field value for semantic_text field', async () => {
        let updatedMappings = { ...defaultMappings };

        // Mapped fields - Use an existing text field as reference
        const addFieldButton = screen.getByTestId('addFieldButton');
        fireEvent.click(addFieldButton);

        await screen.findByTestId('createFieldForm');

        const newField = {
          name: 'someNewField',
          type: 'semantic_text',
          referenceField: 'title',
        };

        // Start adding the semantic_text field
        const nameInput = screen.getByTestId('nameParameterInput');
        fireEvent.change(nameInput, { target: { value: newField.name } });

        // Select semantic_text type using EuiComboBox harness
        const typeComboBox = new EuiComboBoxTestHarness('fieldType');
        await typeComboBox.select(getTypeLabel(newField.type));
        await typeComboBox.close();

        // Wait for reference field selector to appear with the address.city option
        await screen.findByTestId('referenceFieldSelect');

        const referenceSelect = new EuiSuperSelectTestHarness('referenceFieldSelect');
        await referenceSelect.select(`select-reference-field-${newField.referenceField}`);

        const addButton = screen.getByTestId('addButton');
        fireEvent.click(addButton);

        await waitFor(() => {
          const documentFields = screen.getByTestId('documentFields');
          const listItems = within(documentFields).getAllByTestId((content) =>
            content.startsWith('fieldsListItem ')
          );
          const found = listItems.some((it) => {
            const fieldNameEls = within(it).queryAllByTestId(/fieldName/);
            return fieldNameEls.some((el) => {
              if ((el.textContent || '').trim() !== newField.name) return false;

              let node: HTMLElement | null = el as HTMLElement;
              while (node && node !== it) {
                const subj = node.getAttribute('data-test-subj');
                if (typeof subj === 'string' && subj.startsWith('fieldsListItem ')) return false;
                node = node.parentElement;
              }

              return true;
            });
          });
          expect(found).toBe(true);
        });

        updatedMappings = {
          ...updatedMappings,
          properties: {
            ...updatedMappings.properties,
            [newField.name]: { reference_field: 'title', type: 'semantic_text' },
          },
        };

        await waitFor(() => {
          expect(onChangeHandler).toHaveBeenCalled();
          const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
          data = lastCall.getData(lastCall.isValid ?? true);
          expect(data).toEqual(updatedMappings);
        });
      }, 6500);
    });

    describe('props.indexMode sets the correct default value of _source field', () => {
      it("defaults to 'stored' with 'standard' index mode prop", async () => {
        setup(
          {
            value: { ...defaultMappings, _source: undefined },
            onChange: onChangeHandler,
            indexMode: 'standard',
          },
          ctx
        );

        await screen.findByTestId('mappingsEditor');

        await selectTab('advanced');

        const sourceValueButton = screen.getByTestId('sourceValueField');
        expect(sourceValueButton.textContent).toContain('Stored _source');
      });

      (['logsdb', 'time_series'] as const).forEach((indexMode) => {
        it(`defaults to 'synthetic' with ${indexMode} index mode prop when 'canUseSyntheticSource' is set to true`, async () => {
          setup(
            {
              value: { ...defaultMappings, _source: undefined },
              onChange: onChangeHandler,
              indexMode,
            },
            ctx
          );

          await screen.findByTestId('mappingsEditor');

          await selectTab('advanced');

          await waitFor(() => {
            const sourceValueButton = screen.getByTestId('sourceValueField');
            expect(sourceValueButton.textContent).toContain('Synthetic _source');
          });
        });

        it(`defaults to 'standard' with ${indexMode} index mode prop when 'canUseSyntheticSource' is set to true`, async () => {
          setup(
            {
              value: { ...defaultMappings, _source: undefined },
              onChange: onChangeHandler,
              indexMode,
            },
            { ...ctx, canUseSyntheticSource: false }
          );

          await screen.findByTestId('mappingsEditor');

          await selectTab('advanced');

          const sourceValueButton = screen.getByTestId('sourceValueField');
          expect(sourceValueButton.textContent).toContain('Stored _source');
        });
      });
    });
  });

  describe('multi-fields support', () => {
    it('allows multi-fields for most types', async () => {
      const value = {
        properties: {
          name1: {
            type: 'wildcard',
          },
        },
      };

      setup({ onChange: onChangeHandler, value });

      await screen.findByTestId('mappingsEditor');

      expect(screen.getByTestId('addMultiFieldButton')).toBeInTheDocument();
    });

    it('keeps the fields property in the field', async () => {
      const value = {
        properties: {
          name1: {
            type: 'wildcard',
            fields: {
              text: {
                type: 'match_only_text',
              },
            },
          },
        },
      };

      setup({ onChange: onChangeHandler, value });

      await screen.findByTestId('mappingsEditor');

      // Verify onChange was called with the value including fields property
      expect(onChangeHandler).toHaveBeenCalled();
      const lastCall = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1][0];
      data = lastCall.getData(lastCall.isValid ?? true);
      expect(data).toEqual(value);
    });
  });
});
