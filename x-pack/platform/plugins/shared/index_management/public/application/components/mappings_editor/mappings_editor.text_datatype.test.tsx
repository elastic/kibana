/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import SemVer from 'semver/classes/semver';
import { docLinksServiceMock, uiSettingsServiceMock } from '@kbn/core/public/mocks';
import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';

import { MAJOR_VERSION } from '../../../../common';
import { useAppContext } from '../../app_context';
import { MappingsEditor } from './mappings_editor';
import { MappingsEditorProvider } from './mappings_editor_context';
import { createKibanaReactContext } from './shared_imports';
import { getFieldConfig } from './lib';

jest.mock('@kbn/code-editor');

type UseFieldType = typeof import('./shared_imports').UseField;
type GetFieldConfigType = typeof import('./lib').getFieldConfig;

jest.mock('./components/document_fields/field_parameters/type_parameter', () => {
  const sharedImports = jest.requireActual('./shared_imports');
  const lib = jest.requireActual('./lib');
  const UseFieldActual = sharedImports.UseField as UseFieldType;
  const getFieldConfigActual = lib.getFieldConfig as GetFieldConfigType;

  const options = [
    { value: 'text', label: 'text' },
    { value: 'semantic_text', label: 'semantic_text' },
    { value: 'other', label: 'other' },
  ];

  const TypeParameter = () => (
    <UseFieldActual<Array<{ value: string; label: string }>>
      path="type"
      config={getFieldConfigActual<Array<{ value: string; label: string }>>('type')}
    >
      {(field) => {
        return (
          <select
            data-test-subj="fieldType"
            defaultValue={field.value?.[0]?.value ?? ''}
            onBlur={(e) => field.setValue([{ value: e.target.value, label: e.target.value }])}
          >
            <option value="" />
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }}
    </UseFieldActual>
  );

  return { __esModule: true, TypeParameter };
});

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    EuiPortal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    EuiOverlayMask: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    EuiSuperSelect: ({
      options,
      valueOfSelected,
      onChange,
      'data-test-subj': dataTestSubj,
    }: {
      options: Array<{
        value: string;
        inputDisplay?: import('react').ReactNode;
        dropdownDisplay?: import('react').ReactNode;
      }>;
      valueOfSelected: string;
      onChange: (value: string) => void;
      'data-test-subj'?: string;
    }) => (
      <select
        data-test-subj={dataTestSubj ?? 'select'}
        defaultValue={valueOfSelected}
        onBlur={(e) => onChange((e.target as HTMLSelectElement).value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.inputDisplay ?? opt.value}
          </option>
        ))}
      </select>
    ),
  };
});

jest.mock('../../app_context', () => {
  const actual = jest.requireActual('../../app_context');
  return {
    ...actual,
    useAppContext: jest.fn(),
  };
});

const { GlobalFlyoutProvider } = GlobalFlyout;
const mockUseAppContext = useAppContext as unknown as jest.MockedFunction<typeof useAppContext>;
const docLinks = docLinksServiceMock.createStartContract();
const kibanaVersion = new SemVer(MAJOR_VERSION);
const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  kibanaVersion: {
    get: () => kibanaVersion,
  },
});

const defaultTextParameters = {
  type: 'text',
  eager_global_ordinals: false,
  fielddata: false,
  index: true,
  index_options: 'positions',
  index_phrases: false,
  norms: true,
  store: false,
};

const onChangeHandler = jest.fn();

interface TestMappings {
  properties: Record<string, Record<string, unknown>>;
  _meta?: Record<string, unknown>;
  _source?: Record<string, unknown>;
}

const openFieldEditor = async () => {
  const listItem = screen.getByTestId('fieldsListItem myFieldField');
  const editButton = within(listItem).getByTestId('editFieldButton');
  fireEvent.click(editButton);
  return screen.findByTestId('mappingsEditorFieldEdit');
};

const toggleAdvancedSettings = async (flyout: HTMLElement) => {
  const advancedToggle = within(flyout).getByTestId('toggleAdvancedSetting');
  fireEvent.click(advancedToggle);
  await waitFor(() => {
    const advancedSettings = within(flyout).getByTestId('advancedSettings');
    expect(advancedSettings.style.display).not.toBe('none');
  });
};

const updateFieldName = (flyout: HTMLElement, name: string) => {
  const nameInput = within(flyout).getByTestId('nameParameterInput');
  fireEvent.change(nameInput, { target: { value: name } });
};

const submitForm = async (flyout: HTMLElement) => {
  const updateButton = within(flyout).getByTestId('editFieldUpdateButton');
  fireEvent.click(updateButton);
  await waitFor(() => {
    expect(onChangeHandler).toHaveBeenCalled();
  });
};

const getLatestMappings = () => {
  const [callData] = onChangeHandler.mock.calls[onChangeHandler.mock.calls.length - 1];
  return callData.getData();
};

const setAnalyzerValue = async (flyout: HTMLElement, rowTestSubj: string, value: string) => {
  const rows = within(flyout).getAllByTestId(rowTestSubj);
  const row =
    rows.find((r) => within(r).queryByTestId('select') !== null) ??
    rows.find((r) => r.querySelector('select') !== null) ??
    rows[0];

  const select = within(row).getByTestId('select') as HTMLSelectElement;

  await act(async () => {
    fireEvent.change(select, { target: { value } });
    fireEvent.blur(select);
  });
};

const toggleUseSameSearchAnalyzer = (flyout: HTMLElement) => {
  fireEvent.click(within(flyout).getByRole('checkbox'));
};

type MappingsEditorTestProps = Omit<
  React.ComponentProps<typeof MappingsEditor>,
  'docLinks' | 'esNodesPlugins'
>;

const renderMappingsEditor = (props: Partial<MappingsEditorTestProps>) => {
  const { onChange, ...restProps } = props;
  const mergedProps: React.ComponentProps<typeof MappingsEditor> = {
    ...restProps,
    docLinks,
    esNodesPlugins: [],
    onChange: onChange ?? (() => undefined),
  };

  return render(
    <React.Fragment>
      <I18nProvider>
        <KibanaReactContextProvider>
          <MappingsEditorProvider>
            <GlobalFlyoutProvider>
              <MappingsEditor {...mergedProps} />
            </GlobalFlyoutProvider>
          </MappingsEditorProvider>
        </KibanaReactContextProvider>
      </I18nProvider>
    </React.Fragment>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAppContext.mockReturnValue({
    canUseSyntheticSource: true,
    config: { enableMappingsSourceFieldSection: false },
  } as unknown as ReturnType<typeof useAppContext>);
});

describe('Mappings editor: text datatype', () => {
  describe('WHEN a text field is opened for editing', () => {
    it('SHOULD show default parameters values', async () => {
      const defaultMappings = {
        properties: {
          myField: {
            type: 'text',
          },
        },
      };

      renderMappingsEditor({
        value: defaultMappings,
        onChange: onChangeHandler,
        indexSettings: {},
      });

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
  });

  describe('WHEN editing analyzer parameters', () => {
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

    it('SHOULD apply default values and show correct initial analyzers', async () => {
      renderMappingsEditor({
        value: defaultMappingsWithAnalyzer,
        onChange: onChangeHandler,
        indexSettings: {},
      });

      await screen.findByTestId('mappingsEditor');

      const newFieldName = 'updatedField';

      // Edit field, change name, and save to apply defaults
      const flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);

      // searchQuoteAnalyzer should show 'french' language (native select)
      const allSelects = within(flyout).getAllByTestId('select');
      const frenchAnalyzerSelect = allSelects.find(
        (el) => el.tagName === 'SELECT' && (el as HTMLSelectElement).value === 'french'
      ) as HTMLSelectElement | undefined;
      expect(frenchAnalyzerSelect).toBeDefined();

      // "Use same analyzer for search" should be checked
      expect(within(flyout).getByRole('checkbox')).toBeChecked();
      // searchAnalyzer should not exist when checkbox is checked
      expect(within(flyout).queryByTestId('searchAnalyzer')).not.toBeInTheDocument();

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
    });

    // Checkbox toggle behavior is unit tested in analyzer_parameter.test.tsx

    it('SHOULD persist updated analyzer values after save', async () => {
      renderMappingsEditor({
        value: defaultMappingsWithAnalyzer,
        onChange: onChangeHandler,
        indexSettings: {},
      });

      await screen.findByTestId('mappingsEditor');

      const flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);
      updateFieldName(flyout, 'updatedField');

      // Change indexAnalyzer from default to 'standard'
      await setAnalyzerValue(flyout, 'indexAnalyzer', 'standard');

      // Uncheck "use same analyzer" to reveal searchAnalyzer
      toggleUseSameSearchAnalyzer(flyout);
      await waitFor(() => {
        expect(within(flyout).queryByTestId('searchAnalyzer')).toBeInTheDocument();
      });

      // Change searchAnalyzer to 'simple'
      await setAnalyzerValue(flyout, 'searchAnalyzer', 'simple');

      // Change searchQuoteAnalyzer from language (french) to built-in (whitespace)
      await setAnalyzerValue(flyout, 'searchQuoteAnalyzer', 'whitespace');

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
    });

    // Custom/built-in mode rendering and toggle behavior are unit tested in analyzer_parameter.test.tsx.
    // This integration-style test verifies that custom analyzer changes serialize correctly through the full form pipeline.
    it('SHOULD correctly serialize custom analyzer changes', async () => {
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

      renderMappingsEditor({
        value: defaultMappings,
        onChange: onChangeHandler,
        indexSettings: {},
      });

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
      await setAnalyzerValue(flyout, 'searchAnalyzer', 'whitespace');

      // Toggle searchQuote analyzer from custom to built-in (defaults to "index default")
      fireEvent.click(within(flyout).getByTestId('searchQuoteAnalyzer-toggleCustomButton'));
      await waitFor(() =>
        expect(within(flyout).getByTestId('searchQuoteAnalyzer')).toBeInTheDocument()
      );

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
    });

    // Index settings analyzer rendering is unit tested in analyzer_parameter.test.tsx.
    it('SHOULD correctly serialize index settings analyzer changes', async () => {
      const indexSettings = {
        analysis: {
          analyzer: {
            customAnalyzer1: { type: 'custom', tokenizer: 'standard' },
            customAnalyzer2: { type: 'custom', tokenizer: 'standard' },
            customAnalyzer3: { type: 'custom', tokenizer: 'standard' },
          },
        },
      };

      const defaultMappings: TestMappings = {
        properties: {
          myField: { type: 'text', analyzer: 'customAnalyzer1' },
        },
      };

      renderMappingsEditor({ value: defaultMappings, onChange: onChangeHandler, indexSettings });

      await screen.findByTestId('mappingsEditor');

      const flyout = await openFieldEditor();
      await toggleAdvancedSettings(flyout);

      // Wait for the custom analyzer native select to appear, then change value
      const customSelect = await waitFor(() => {
        const el = within(flyout).getByDisplayValue('customAnalyzer1');
        expect(el.tagName).toBe('SELECT');
        return el as HTMLSelectElement;
      });

      fireEvent.change(customSelect, { target: { value: 'customAnalyzer3' } });

      await submitForm(flyout);

      expect(getLatestMappings()).toEqual({
        properties: {
          myField: {
            ...defaultMappings.properties.myField,
            ...defaultTextParameters,
            analyzer: 'customAnalyzer3',
          },
        },
      });
    });
  });
});
