/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiSuperSelectTestHarness } from '@kbn/test-eui-helpers';

import { WithAppDependencies, kibanaVersion } from '../helpers/setup_environment';
import { MappingsEditor } from '../../../mappings_editor';
import { getFieldConfig } from '../../../lib';
import { defaultTextParameters } from './fixtures';
import type { TestMappings } from './text_datatype.helpers';
import {
  getLatestMappings,
  onChangeHandler,
  openFieldEditor,
  selectAnalyzer,
  submitForm,
  toggleAdvancedSettings,
  toggleUseSameSearchAnalyzer,
  updateFieldName,
} from './text_datatype.helpers';

beforeEach(() => {
  jest.clearAllMocks();
});

// substantial helpers extracted to `text_datatype.helpers.tsx`

describe('Mappings editor: text datatype', () => {
  test('initial view and default parameters values', async () => {
    const defaultMappings = {
      properties: {
        myField: {
          type: 'text',
        },
      },
    };

    const Component = WithAppDependencies(MappingsEditor, {});
    render(
      <I18nProvider>
        <Component value={defaultMappings} onChange={onChangeHandler} indexSettings={{}} />
      </I18nProvider>
    );

    await screen.findByTestId('mappingsEditor');

    const flyout = await openFieldEditor();

    updateFieldName(flyout, 'updatedField');

    // It should have searchable ("index" param) active by default
    const indexFieldConfig = getFieldConfig('index');
    const indexParameterSection = within(flyout).getByTestId('indexParameter');
    const indexToggle = within(indexParameterSection).getByTestId('formRowToggle');
    expect(indexToggle.getAttribute('aria-checked')).toBe(String(indexFieldConfig.defaultValue));

    if (kibanaVersion.major < 7) {
      expect(within(flyout).queryByTestId('boostParameterToggle')).toBeInTheDocument();
    } else {
      // Since 8.x the boost parameter is deprecated
      expect(within(flyout).queryByTestId('boostParameterToggle')).not.toBeInTheDocument();
    }

    await submitForm(flyout);

    // It should have the default parameters values added
    const updatedMappings = {
      properties: {
        updatedField: {
          ...defaultTextParameters,
        },
      },
    };

    expect(getLatestMappings()).toEqual(updatedMappings);
  });

  // FLAKY: https://github.com/elastic/kibana/issues/253348
  describe.skip('analyzer parameter', () => {
    const defaultMappingsWithAnalyzer = {
      _meta: {},
      _source: {},
      properties: {
        myField: {
          type: 'text',
          search_quote_analyzer: 'french',
        },
      },
    };

    afterEach(() => {
      // Ensure flyout is closed after each test
      const flyout = screen.queryByTestId('mappingsEditorFieldEdit');
      if (flyout) {
        const closeButton = within(flyout).queryByTestId('euiFlyoutCloseButton');
        if (closeButton) {
          fireEvent.click(closeButton);
        }
      }
    });

    test('should apply default values and show correct initial analyzers', async () => {
      const Component = WithAppDependencies(MappingsEditor, {});
      render(
        <I18nProvider>
          <Component
            value={defaultMappingsWithAnalyzer}
            onChange={onChangeHandler}
            indexSettings={{}}
          />
        </I18nProvider>
      );

      await screen.findByTestId('mappingsEditor');

      const newFieldName = 'updatedField';

      // Edit field, change name, and save to apply defaults
      const flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);
      updateFieldName(flyout, newFieldName);
      await submitForm(flyout);

      // Verify default parameters were added
      const updatedMappings = {
        ...defaultMappingsWithAnalyzer,
        properties: {
          updatedField: {
            ...defaultMappingsWithAnalyzer.properties.myField,
            ...defaultTextParameters,
          },
        },
      };

      expect(getLatestMappings()).toEqual(updatedMappings);

      // Re-open and verify initial analyzer states
      const flyoutReopened = await openFieldEditor();
      await toggleAdvancedSettings(flyoutReopened);

      // indexAnalyzer should default to "Index default"
      const indexAnalyzerHarness = new EuiSuperSelectTestHarness('indexAnalyzer');
      expect(indexAnalyzerHarness.getSelected()).toContain('Index default');

      // searchQuoteAnalyzer should show 'french' language
      const allSelects = within(flyoutReopened).getAllByTestId('select');
      const frenchAnalyzerSelect = allSelects.find(
        (el) =>
          el.tagName === 'SELECT' &&
          (el as HTMLSelectElement).value ===
            defaultMappingsWithAnalyzer.properties.myField.search_quote_analyzer
      ) as HTMLSelectElement;
      expect(frenchAnalyzerSelect).toHaveValue('french');

      // "Use same analyzer for search" should be checked
      expect(within(flyoutReopened).getByRole('checkbox')).toBeChecked();

      // searchAnalyzer should not exist when checkbox is checked
      expect(within(flyoutReopened).queryByTestId('searchAnalyzer')).not.toBeInTheDocument();
    }, 20000);

    test('should toggle search analyzer visibility when unchecking checkbox', async () => {
      const Component = WithAppDependencies(MappingsEditor, {});
      render(
        <I18nProvider>
          <Component
            value={defaultMappingsWithAnalyzer}
            onChange={onChangeHandler}
            indexSettings={{}}
          />
        </I18nProvider>
      );

      await screen.findByTestId('mappingsEditor');

      // Open field editor with advanced settings
      const flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);

      // Verify "use same analyzer" checkbox is checked initially
      let useSameAnalyzerCheckbox = within(flyout).getByRole('checkbox');
      expect(useSameAnalyzerCheckbox).toBeChecked();
      expect(within(flyout).queryByTestId('searchAnalyzer')).not.toBeInTheDocument();

      // Uncheck the checkbox
      toggleUseSameSearchAnalyzer(flyout);

      await waitFor(() => {
        expect(within(flyout).queryByTestId('searchAnalyzer')).toBeInTheDocument();
      });

      // Verify both analyzers are present with 'Index default' selected
      const indexAnalyzerHarness = new EuiSuperSelectTestHarness('indexAnalyzer');
      const searchAnalyzerHarness = new EuiSuperSelectTestHarness('searchAnalyzer');
      expect(indexAnalyzerHarness.getSelected()).toContain('Index default');
      expect(searchAnalyzerHarness.getSelected()).toContain('Index default');

      // Verify checkbox is now unchecked
      useSameAnalyzerCheckbox = within(flyout).getByRole('checkbox');
      expect(useSameAnalyzerCheckbox).not.toBeChecked();
    });

    test('should update and persist indexAnalyzer value', async () => {
      const Component = WithAppDependencies(MappingsEditor, {});
      render(
        <I18nProvider>
          <Component
            value={defaultMappingsWithAnalyzer}
            onChange={onChangeHandler}
            indexSettings={{}}
          />
        </I18nProvider>
      );

      await screen.findByTestId('mappingsEditor');

      let flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);
      updateFieldName(flyout, 'updatedField');

      await selectAnalyzer(flyout, 'indexAnalyzer', 'standard');
      await submitForm(flyout);

      const updatedMappings = {
        ...defaultMappingsWithAnalyzer,
        properties: {
          updatedField: {
            ...defaultMappingsWithAnalyzer.properties.myField,
            ...defaultTextParameters,
            analyzer: 'standard',
          },
        },
      };

      expect(getLatestMappings()).toEqual(updatedMappings);

      // Re-open and verify value persisted
      flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);
      const indexAnalyzerHarnessFinal = new EuiSuperSelectTestHarness('indexAnalyzer');
      expect(indexAnalyzerHarnessFinal.getSelected()).toContain('Standard');
    });

    test('should update and persist searchAnalyzer value', async () => {
      const Component = WithAppDependencies(MappingsEditor, {});
      render(
        <I18nProvider>
          <Component
            value={defaultMappingsWithAnalyzer}
            onChange={onChangeHandler}
            indexSettings={{}}
          />
        </I18nProvider>
      );

      await screen.findByTestId('mappingsEditor');

      let flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);
      updateFieldName(flyout, 'updatedField');

      toggleUseSameSearchAnalyzer(flyout);
      expect(within(flyout).queryByTestId('searchAnalyzer')).toBeInTheDocument();

      await selectAnalyzer(flyout, 'searchAnalyzer', 'simple');
      await submitForm(flyout);

      const updatedMappings = {
        ...defaultMappingsWithAnalyzer,
        properties: {
          updatedField: {
            ...defaultMappingsWithAnalyzer.properties.myField,
            ...defaultTextParameters,
            search_analyzer: 'simple',
          },
        },
      };

      expect(getLatestMappings()).toEqual(updatedMappings);

      // Re-open and verify value persisted
      flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);
      // searchAnalyzer should be visible since we saved with search_analyzer set
      await waitFor(() => {
        expect(within(flyout).queryByTestId('searchAnalyzer')).toBeInTheDocument();
      });
      const searchAnalyzerHarnessFinal = new EuiSuperSelectTestHarness('searchAnalyzer');
      expect(searchAnalyzerHarnessFinal.getSelected()).toContain('Simple');
    });

    test('should update and persist searchQuoteAnalyzer value', async () => {
      const Component = WithAppDependencies(MappingsEditor, {});
      render(
        <I18nProvider>
          <Component
            value={defaultMappingsWithAnalyzer}
            onChange={onChangeHandler}
            indexSettings={{}}
          />
        </I18nProvider>
      );

      await screen.findByTestId('mappingsEditor');

      let flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);
      updateFieldName(flyout, 'updatedField');

      // Change searchQuoteAnalyzer from language (french) to built-in (whitespace)
      await selectAnalyzer(flyout, 'searchQuoteAnalyzer', 'whitespace');

      await submitForm(flyout);

      const updatedMappings = {
        ...defaultMappingsWithAnalyzer,
        properties: {
          updatedField: {
            ...defaultMappingsWithAnalyzer.properties.myField,
            ...defaultTextParameters,
            search_quote_analyzer: 'whitespace',
          },
        },
      };

      expect(getLatestMappings()).toEqual(updatedMappings);

      // Re-open and verify value persisted
      flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);
      // Wait for SuperSelect to appear (it should be in built-in mode since we saved 'whitespace')
      const searchQuoteAnalyzerHarnessFinal = await waitFor(() => {
        const harness = new EuiSuperSelectTestHarness('searchQuoteAnalyzer');
        expect(harness.getElement()).toBeInTheDocument();
        return harness;
      });
      expect(searchQuoteAnalyzerHarnessFinal.getSelected()).toContain('Whitespace');
    }, 9000);

    test('analyzer parameter: custom analyzer (external plugin)', async () => {
      const defaultMappings: TestMappings = {
        _meta: {},
        _source: {},
        properties: {
          myField: {
            type: 'text',
            analyzer: 'myCustomIndexAnalyzer',
            search_analyzer: 'myCustomSearchAnalyzer',
            search_quote_analyzer: 'myCustomSearchQuoteAnalyzer',
          },
        },
      };

      let updatedMappings: TestMappings = {
        ...defaultMappings,
        properties: {
          myField: {
            ...defaultMappings.properties.myField,
            ...defaultTextParameters,
          },
        },
      };

      const Component = WithAppDependencies(MappingsEditor, {});
      render(
        <I18nProvider>
          <Component value={defaultMappings} onChange={onChangeHandler} indexSettings={{}} />
        </I18nProvider>
      );

      await screen.findByTestId('mappingsEditor');

      const editButton = screen.getByTestId('editFieldButton');
      fireEvent.click(editButton);

      const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

      const advancedToggle = within(flyout).getByTestId('toggleAdvancedSetting');
      fireEvent.click(advancedToggle);

      await waitFor(() => {
        const advancedSettings = within(flyout).getByTestId('advancedSettings');
        expect(advancedSettings.style.display).not.toBe('none');
      });

      expect(within(flyout).queryByTestId('indexAnalyzer-custom')).toBeInTheDocument();
      expect(within(flyout).queryByTestId('searchAnalyzer-custom')).toBeInTheDocument();
      expect(within(flyout).queryByTestId('searchQuoteAnalyzer-custom')).toBeInTheDocument();

      // TextField doesn't forward data-test-subj to the input element (similar to CheckBoxField)
      // Query by value instead
      const allTextInputs = within(flyout).getAllByRole<HTMLInputElement>('textbox');
      const indexAnalyzerCustom = allTextInputs.find(
        (inp) => inp.value === String(defaultMappings.properties.myField.analyzer)
      );
      const searchAnalyzerCustom = allTextInputs.find(
        (inp) => inp.value === String(defaultMappings.properties.myField.search_analyzer)
      );
      const searchQuoteAnalyzerCustom = allTextInputs.find(
        (inp) => inp.value === String(defaultMappings.properties.myField.search_quote_analyzer)
      );

      expect(indexAnalyzerCustom).toHaveValue(String(defaultMappings.properties.myField.analyzer));
      expect(searchAnalyzerCustom).toHaveValue(
        String(defaultMappings.properties.myField.search_analyzer)
      );
      expect(searchQuoteAnalyzerCustom).toHaveValue(
        String(defaultMappings.properties.myField.search_quote_analyzer)
      );

      const updatedIndexAnalyzer = 'newCustomIndexAnalyzer';
      const updatedSearchAnalyzer = 'whitespace';

      // Change the index analyzer to another custom one
      fireEvent.change(indexAnalyzerCustom!, { target: { value: updatedIndexAnalyzer } });

      // Change the search analyzer to a built-in analyzer
      const searchAnalyzerToggleButton = within(flyout).getByTestId(
        'searchAnalyzer-toggleCustomButton'
      );
      fireEvent.click(searchAnalyzerToggleButton);

      // After toggling, the searchAnalyzer becomes a select with default value 'index_default'
      await waitFor(() => {
        const textInputsAfterToggle = within(flyout).queryAllByRole<HTMLInputElement>('textbox');
        const stillHasCustomSearchAnalyzer = textInputsAfterToggle.some(
          (inp) => inp.value === defaultMappings.properties.myField.search_analyzer
        );
        expect(stillHasCustomSearchAnalyzer).toBe(false);
      });
      await selectAnalyzer(flyout, 'searchAnalyzer', 'whitespace');

      // Change the searchQuote to use built-in analyzer
      // By default it means using the "index default"
      const searchQuoteAnalyzerToggleButton = within(flyout).getByTestId(
        'searchQuoteAnalyzer-toggleCustomButton'
      );
      fireEvent.click(searchQuoteAnalyzerToggleButton);

      // Allow SuperSelect to appear after toggle

      const searchQuoteHarness = new EuiSuperSelectTestHarness('searchQuoteAnalyzer');
      expect(searchQuoteHarness.getElement()).toBeInTheDocument();
      // Should show "Index default" initially
      expect(searchQuoteHarness.getSelected()).toContain('Index default');

      const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
      fireEvent.click(updateButton);

      // Allow form submission to complete

      await waitFor(() => {
        expect(onChangeHandler).toHaveBeenCalled();
      });

      updatedMappings = {
        ...updatedMappings,
        properties: {
          myField: {
            ...updatedMappings.properties.myField,
            analyzer: updatedIndexAnalyzer,
            search_analyzer: updatedSearchAnalyzer,
            search_quote_analyzer: undefined, // Index default means not declaring the analyzer
          },
        },
      };

      const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
      const actualMappings = callData.getData();
      expect(actualMappings).toEqual(updatedMappings);
    });

    test('analyzer parameter: custom analyzer (from index settings)', async () => {
      const indexSettings = {
        analysis: {
          analyzer: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            customAnalyzer_1: {
              type: 'custom',
              tokenizer: 'standard',
            },
            // eslint-disable-next-line @typescript-eslint/naming-convention
            customAnalyzer_2: {
              type: 'custom',
              tokenizer: 'standard',
            },
            // eslint-disable-next-line @typescript-eslint/naming-convention
            customAnalyzer_3: {
              type: 'custom',
              tokenizer: 'standard',
            },
          },
        },
      };

      const customAnalyzers = Object.keys(indexSettings.analysis.analyzer);

      const defaultMappings: TestMappings = {
        properties: {
          myField: {
            type: 'text',
            analyzer: customAnalyzers[0],
          },
        },
      };

      let updatedMappings: TestMappings = {
        ...defaultMappings,
        properties: {
          myField: {
            ...defaultMappings.properties.myField,
            ...defaultTextParameters,
          },
        },
      };

      const Component = WithAppDependencies(MappingsEditor, {});
      render(
        <I18nProvider>
          <Component
            value={defaultMappings}
            onChange={onChangeHandler}
            indexSettings={indexSettings}
          />
        </I18nProvider>
      );

      await screen.findByTestId('mappingsEditor');

      const editButton = screen.getByTestId('editFieldButton');
      fireEvent.click(editButton);

      const flyout = await screen.findByTestId('mappingsEditorFieldEdit');

      const advancedToggle = within(flyout).getByTestId('toggleAdvancedSetting');
      fireEvent.click(advancedToggle);

      await waitFor(() => {
        const advancedSettings = within(flyout).getByTestId('advancedSettings');
        expect(advancedSettings.style.display).not.toBe('none');
      });

      // The field has a custom analyzer from index settings, so indexAnalyzer should render
      // as a native select (not SuperSelect) that lists the custom analyzers
      await waitFor(() => {
        const selects = within(flyout).queryAllByTestId('select') as HTMLSelectElement[];
        const customAnalyzerSelect = selects.find(
          (sel) => sel.value === defaultMappings.properties.myField.analyzer
        );
        expect(customAnalyzerSelect).toBeTruthy();
      });

      // Find the sub-select (native select) for the custom analyzer
      const allControls = within(flyout).queryAllByTestId('select') as Array<
        HTMLInputElement | HTMLSelectElement
      >;
      const customAnalyzerSelect = allControls.find(
        (el) =>
          el.tagName === 'SELECT' &&
          el.getAttribute('data-test-subj') === 'select' &&
          (el as HTMLSelectElement).value === String(defaultMappings.properties.myField.analyzer)
      ) as HTMLSelectElement;

      expect(customAnalyzerSelect).toBeDefined();
      expect(customAnalyzerSelect).toHaveValue(String(defaultMappings.properties.myField.analyzer));

      // Access the list of option of the custom analyzer select
      const subSelectOptions = Array.from(customAnalyzerSelect.options).map(
        (option) => (option as HTMLOptionElement).text
      );

      expect(subSelectOptions).toEqual(customAnalyzers);

      // Change the custom analyzer dropdown to another one from the index settings
      fireEvent.change(customAnalyzerSelect, { target: { value: customAnalyzers[2] } });

      const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
      fireEvent.click(updateButton);

      // Allow form submission to complete

      await waitFor(() => {
        expect(onChangeHandler).toHaveBeenCalled();
      });

      updatedMappings = {
        ...updatedMappings,
        properties: {
          myField: {
            ...updatedMappings.properties.myField,
            analyzer: customAnalyzers[2],
          },
        },
      };

      const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
      const actualMappings = callData.getData();
      expect(actualMappings).toEqual(updatedMappings);
    });
  });
});
