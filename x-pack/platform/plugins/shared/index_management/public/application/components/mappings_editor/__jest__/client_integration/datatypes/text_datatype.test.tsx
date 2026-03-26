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

  describe('analyzer parameter', () => {
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

    // Checkbox toggle behavior is unit tested in analyzer_parameter.test.tsx

    test('should persist updated analyzer values after save', async () => {
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

      // Change indexAnalyzer from default to 'standard'
      await selectAnalyzer(flyout, 'indexAnalyzer', 'standard');

      // Uncheck "use same analyzer" to reveal searchAnalyzer
      toggleUseSameSearchAnalyzer(flyout);
      await waitFor(() => {
        expect(within(flyout).queryByTestId('searchAnalyzer')).toBeInTheDocument();
      });

      // Change searchAnalyzer to 'simple'
      await selectAnalyzer(flyout, 'searchAnalyzer', 'simple');

      // Change searchQuoteAnalyzer from language (french) to built-in (whitespace)
      await selectAnalyzer(flyout, 'searchQuoteAnalyzer', 'whitespace');

      await submitForm(flyout);

      const updatedMappings = {
        ...defaultMappingsWithAnalyzer,
        properties: {
          updatedField: {
            ...defaultMappingsWithAnalyzer.properties.myField,
            ...defaultTextParameters,
            analyzer: 'standard',
            search_analyzer: 'simple',
            search_quote_analyzer: 'whitespace',
          },
        },
      };

      expect(getLatestMappings()).toEqual(updatedMappings);

      // Re-open and verify all analyzer values persisted in the UI
      flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);

      const indexAnalyzerHarness = new EuiSuperSelectTestHarness('indexAnalyzer');
      expect(indexAnalyzerHarness.getSelected()).toContain('Standard');

      // searchAnalyzer should be visible (checkbox unchecked since search_analyzer was saved)
      await waitFor(() => {
        expect(within(flyout).queryByTestId('searchAnalyzer')).toBeInTheDocument();
      });
      const searchAnalyzerHarness = new EuiSuperSelectTestHarness('searchAnalyzer');
      expect(searchAnalyzerHarness.getSelected()).toContain('Simple');

      const searchQuoteAnalyzerHarness = new EuiSuperSelectTestHarness('searchQuoteAnalyzer');
      expect(searchQuoteAnalyzerHarness.getElement()).toBeInTheDocument();
      expect(searchQuoteAnalyzerHarness.getSelected()).toContain('Whitespace');
    }, 15000);

    // Custom/built-in mode rendering and toggle behavior are unit tested
    // in analyzer_parameter.test.tsx. This integration test verifies that
    // custom analyzer changes serialize correctly through the full form pipeline.
    test('should correctly serialize custom analyzer changes', async () => {
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

      const Component = WithAppDependencies(MappingsEditor, {});
      render(
        <I18nProvider>
          <Component value={defaultMappings} onChange={onChangeHandler} indexSettings={{}} />
        </I18nProvider>
      );

      await screen.findByTestId('mappingsEditor');

      const flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);

      // Change index analyzer to a different custom value
      const indexAnalyzerCustom = within(flyout).getByDisplayValue(
        'myCustomIndexAnalyzer'
      ) as HTMLInputElement;
      fireEvent.change(indexAnalyzerCustom, { target: { value: 'newCustomIndexAnalyzer' } });

      // Toggle search analyzer from custom to built-in and select 'whitespace'
      fireEvent.click(within(flyout).getByTestId('searchAnalyzer-toggleCustomButton'));
      await waitFor(() => {
        expect(within(flyout).queryByTestId('searchAnalyzer-custom')).not.toBeInTheDocument();
      });
      await selectAnalyzer(flyout, 'searchAnalyzer', 'whitespace');

      // Toggle searchQuote analyzer from custom to built-in (defaults to "index default")
      fireEvent.click(within(flyout).getByTestId('searchQuoteAnalyzer-toggleCustomButton'));
      await waitFor(() => {
        const searchQuoteHarness = new EuiSuperSelectTestHarness('searchQuoteAnalyzer');
        expect(searchQuoteHarness.getElement()).toBeInTheDocument();
        expect(searchQuoteHarness.getSelected()).toContain('Index default');
      });

      await submitForm(flyout);

      const expectedMappings: TestMappings = {
        ...defaultMappings,
        properties: {
          myField: {
            ...defaultMappings.properties.myField,
            ...defaultTextParameters,
            analyzer: 'newCustomIndexAnalyzer',
            search_analyzer: 'whitespace',
            search_quote_analyzer: undefined,
          },
        },
      };

      expect(getLatestMappings()).toEqual(expectedMappings);
    }, 10000);

    // Index settings analyzer rendering is unit tested in analyzer_parameter.test.tsx.
    // This integration test verifies that changing an index settings analyzer serializes correctly.
    test('should correctly serialize index settings analyzer changes', async () => {
      const indexSettings = {
        analysis: {
          analyzer: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            customAnalyzer_1: { type: 'custom', tokenizer: 'standard' },
            // eslint-disable-next-line @typescript-eslint/naming-convention
            customAnalyzer_2: { type: 'custom', tokenizer: 'standard' },
            // eslint-disable-next-line @typescript-eslint/naming-convention
            customAnalyzer_3: { type: 'custom', tokenizer: 'standard' },
          },
        },
      };

      const defaultMappings: TestMappings = {
        properties: {
          myField: { type: 'text', analyzer: 'customAnalyzer_1' },
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

      const flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);

      // Wait for the custom analyzer native select to appear, then change value
      const customSelect = await waitFor(() => {
        const el = within(flyout).getByDisplayValue('customAnalyzer_1');
        expect(el.tagName).toBe('SELECT');
        return el as HTMLSelectElement;
      });

      fireEvent.change(customSelect, { target: { value: 'customAnalyzer_3' } });

      await submitForm(flyout);

      expect(getLatestMappings()).toEqual({
        properties: {
          myField: {
            ...defaultMappings.properties.myField,
            ...defaultTextParameters,
            analyzer: 'customAnalyzer_3',
          },
        },
      });
    }, 10000);
  });
});
