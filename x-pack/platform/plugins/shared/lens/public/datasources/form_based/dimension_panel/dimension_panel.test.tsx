/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, act, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiComboBox, EuiListGroup } from '@elastic/eui';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type { FormBasedDimensionEditorProps } from './dimension_panel';
import { FormBasedDimensionEditorComponent } from './dimension_panel';
import type { IUiSettingsClient, HttpSetup, CoreStart, NotificationsStart } from '@kbn/core/public';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { useExistingFieldsReader } from '@kbn/unified-field-list/src/hooks/use_existing_fields';
import { generateId } from '../../../id_generator';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type {
  FormBasedPrivateState,
  FiltersIndexPatternColumn,
  GenericIndexPatternColumn,
  TermsIndexPatternColumn,
  OperationMetadata,
  DateHistogramIndexPatternColumn,
} from '@kbn/lens-common';
import { replaceColumn } from '../operations';
import { documentField } from '../document_field';
import { getFieldByNameFactory } from '../pure_helpers';
import { Filtering, setFilter } from './filtering';
import { renderWithProviders } from '../../../test_utils/test_utils';

jest.mock('./reference_editor', () => ({
  ReferenceEditor: () => <div data-test-subj="mock-reference-editor" />,
}));
jest.mock('../loader');
jest.mock('@kbn/unified-search-plugin/public', () => ({
  QueryStringInput: () => null,
}));

jest.mock('../operations');

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});
jest.mock('../../../id_generator');
// Mock the Monaco Editor component
jest.mock('../operations/definitions/formula/editor/formula_editor', () => {
  return {
    WrappedFormulaEditor: () => <div />,
    FormulaEditor: () => <div />,
  };
});

jest.mock('@kbn/unified-field-list/src/hooks/use_existing_fields', () => ({
  useExistingFieldsReader: jest.fn(() => {
    return {
      hasFieldData: (dataViewId: string, fieldName: string) => {
        return ['timestamp', 'bytes', 'memory', 'source'].includes(fieldName);
      },
    };
  }),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual<typeof import('@elastic/eui')>('@elastic/eui');
  return {
    ...actual,
    EuiComboBox: jest.fn((props: React.ComponentProps<typeof actual.EuiComboBox>) => (
      <actual.EuiComboBox {...props} />
    )),
    EuiListGroup: jest.fn((props: React.ComponentProps<typeof actual.EuiListGroup>) => (
      <actual.EuiListGroup {...props} />
    )),
  };
});

jest.mock('./filtering', () => {
  const actual = jest.requireActual<typeof import('./filtering')>('./filtering');
  return {
    ...actual,
    Filtering: jest.fn((props: React.ComponentProps<typeof actual.Filtering>) => (
      <actual.Filtering {...props} />
    )),
  };
});

const getComboBoxProps = (testSubject: string) => {
  const props = jest
    .mocked(EuiComboBox)
    .mock.calls.map(([comboBoxProps]) => comboBoxProps)
    .reverse()
    .find((comboBoxProps) => comboBoxProps['data-test-subj'] === testSubject);
  if (!props) {
    throw new Error(`Combo box not rendered: ${testSubject}`);
  }
  return props;
};

const getFieldSelectComboBox = () => getComboBoxProps('indexPattern-dimension-field');

const getOperationItems = () => {
  const props = jest.mocked(EuiListGroup).mock.lastCall?.[0];
  if (!props) {
    throw new Error('Operation list not rendered');
  }
  return props.listItems ?? [];
};

const chooseComboBoxOption = async (testSubject: string, label: string) => {
  const input = within(screen.getByTestId(testSubject)).getByRole('combobox');
  await userEvent.click(input);
  fireEvent.change(input, { target: { value: label } });
  const options = within(
    await screen.findByTestId(new RegExp(`(?:^|\\s)${testSubject}-optionsList(?:\\s|$)`))
  );
  await userEvent.click(
    testSubject === 'indexPattern-dimension-field'
      ? options.getByTestId(
          new RegExp(`(?:^|\\s)lns-fieldOption(?:Incompatible)?-${label}(?:\\s|$)`)
        )
      : options.getByRole('option', { name: label })
  );
};

const openAdvancedOptions = () => {
  fireEvent.click(
    within(screen.getByTestId('indexPattern-advanced-accordion')).getByRole('button', {
      name: 'Advanced',
    })
  );
};

const fields = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'memory',
    displayName: 'memory',
    type: 'number',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  // Added to test issue#148062 about the use of Object method names as fields name
  ...Object.getOwnPropertyNames(Object.getPrototypeOf({})).map((name) => ({
    name,
    displayName: name,
    type: 'string',
    aggregatable: true,
    searchable: true,
    exists: true,
  })),
  documentField,
];

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasExistence: true,
    hasRestrictions: false,
    fields,
    getFieldByName: getFieldByNameFactory(fields),
    getFormatterForField: () => ({ convertToText: (v: unknown) => v }),
    isPersisted: true,
    spec: {},
  },
};

const bytesColumn: GenericIndexPatternColumn = {
  label: 'Sum of bytes',
  dataType: 'number',
  isBucketed: false,

  // Private
  operationType: 'sum',
  sourceField: 'bytes',
  params: { format: { id: 'bytes' } },
};

const lastValueColumn = (
  dataType: GenericIndexPatternColumn['dataType']
): GenericIndexPatternColumn => ({
  label: 'Last value of source',
  dataType,
  isBucketed: false,
  operationType: 'last_value',
  sourceField: 'source',
  params: {},
});

/**
 * The datasource exposes four main pieces of code which are tested at
 * an integration test level. The main reason for this fairly high level
 * of testing is that there is a lot of UI logic that isn't easily
 * unit tested, such as the transient invalid state.
 *
 * - Dimension trigger: Not tested here
 * - Dimension editor component: First half of the tests
 */
describe('FormBasedDimensionEditor', () => {
  let state: FormBasedPrivateState;
  let setState: jest.Mock;
  let defaultProps: FormBasedDimensionEditorProps;

  function getStateWithColumns(columns: Record<string, GenericIndexPatternColumn>) {
    return {
      ...state,
      layers: { first: { ...state.layers.first, columns, columnOrder: Object.keys(columns) } },
    };
  }

  beforeEach(() => {
    state = {
      currentIndexPatternId: '1',
      layers: {
        first: {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Date histogram of timestamp',
              customLabel: true,
              dataType: 'date',
              isBucketed: true,

              // Private
              operationType: 'date_histogram',
              params: {
                interval: '1d',
              },
              sourceField: 'timestamp',
            } as DateHistogramIndexPatternColumn,
          },
          incompleteColumns: {},
        },
      },
    };

    updateEditorState = undefined;
    setState = jest
      .fn<
        ReturnType<FormBasedDimensionEditorProps['setState']>,
        Parameters<FormBasedDimensionEditorProps['setState']>
      >()
      .mockImplementation((...args) => updateEditorState?.(...args));

    defaultProps = {
      indexPatterns: expectedIndexPatterns,
      state,
      setState,
      dateRange: { fromDate: 'now-1d', toDate: 'now' },
      columnId: 'col1',
      layerId: 'first',
      layerType: LayerTypes.DATA,
      uniqueLabel: 'stuff',
      filterOperations: () => true,
      storage: {} as IStorageWrapper,
      uiSettings: {} as IUiSettingsClient,
      http: {} as HttpSetup,
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      unifiedSearch: unifiedSearchPluginMock.createStartContract(),
      kql: kqlPluginMock.createStartContract(),
      dataViews: dataViewPluginMocks.createStartContract(),
      notifications: {} as NotificationsStart,
      data: {
        fieldFormats: {
          getType: jest.fn().mockReturnValue({
            id: 'number',
            title: 'Number',
          }),
          getDefaultType: jest.fn().mockReturnValue({
            id: 'bytes',
            title: 'Bytes',
          }),
          deserialize: jest.fn().mockReturnValue({
            convertToText: () => 'formatted',
          }),
        },
        search: {
          aggs: {
            calculateAutoTimeExpression: jest.fn(),
          },
        },
      } as unknown as DataPublicPluginStart,
      core: {} as CoreStart,
      dimensionGroups: [],
      groupId: 'a',
      isFullscreen: false,
      supportStaticValue: false,
      toggleFullscreen: jest.fn(),
      enableFormatSelector: true,
    };

    jest.clearAllMocks();
  });

  const renderDimensionPanel = (propsOverrides = {}) => {
    const rtlRender = renderWithProviders(
      <FormBasedDimensionEditorComponent {...defaultProps} {...propsOverrides} />
    );

    const getVisibleFieldSelectOptions = () =>
      within(screen.getByTestId('comboBoxOptionsList indexPattern-dimension-field-optionsList'))
        .getAllByTestId('fullText')
        .map((option) => option.textContent);

    return { ...rtlRender, getVisibleFieldSelectOptions };
  };

  let updateEditorState: FormBasedDimensionEditorProps['setState'] | undefined;

  const renderEditor = (element: React.ReactElement<FormBasedDimensionEditorProps>) => {
    let currentProps = element.props;
    const view = renderWithProviders(element);
    updateEditorState = (newState) => {
      currentProps = {
        ...currentProps,
        state: typeof newState === 'function' ? newState(currentProps.state) : newState,
      };
      view.rerender(<FormBasedDimensionEditorComponent {...currentProps} />);
    };
    return view;
  };

  it('should call the filterOperations function', () => {
    const filterOperations = jest.fn().mockReturnValue(true);

    renderDimensionPanel({ filterOperations });
    expect(filterOperations).toHaveBeenCalled();
  });

  it('should show field select', () => {
    renderDimensionPanel();
    expect(screen.getByTestId('indexPattern-dimension-field')).toBeInTheDocument();
  });

  it('should not show field select on fieldless operation', () => {
    renderDimensionPanel({
      state: getStateWithColumns({
        col1: {
          label: 'Filters',
          dataType: 'string',
          isBucketed: false,

          // Private
          operationType: 'filters',
          params: { filters: [] },
        } as FiltersIndexPatternColumn,
      }),
    });
    expect(screen.queryByTestId('indexPattern-dimension-field')).not.toBeInTheDocument();
  });

  it('should not show any choices if the filter returns false', async () => {
    renderDimensionPanel({
      columnId: 'col2',
      filterOperations: () => false,
    });
    await userEvent.click(screen.getByRole('button', { name: /open list of options/i }));
    expect(screen.getByText(/There aren't any options available/)).toBeInTheDocument();
  });
  it('should list all field names and document as a whole in prioritized order', async () => {
    const { getVisibleFieldSelectOptions } = renderDimensionPanel();

    const comboBoxButton = screen.getAllByTestId('comboBoxToggleListButton')[0];
    const comboBoxInput = screen.getAllByTestId('comboBoxSearchInput')[0];
    fireEvent.click(comboBoxButton);

    const allOptions = [
      'Records',
      'timestampLabel',
      'bytes',
      'memory',
      'source',
      // these fields are generated to test the issue #148062 about fields that are using JS Object method names
      ...Object.getOwnPropertyNames(Object.getPrototypeOf({})).sort(),
    ];
    expect(allOptions.slice(0, 7)).toEqual(getVisibleFieldSelectOptions());

    // press arrow up (x2) to go back to the beginning
    fireEvent.keyDown(comboBoxInput, { key: 'ArrowUp', code: 'ArrowUp' });
    fireEvent.keyUp(comboBoxInput, { key: 'ArrowUp', code: 'ArrowUp' });
    fireEvent.keyDown(comboBoxInput, { key: 'ArrowUp', code: 'ArrowUp' });
    fireEvent.keyUp(comboBoxInput, { key: 'ArrowUp', code: 'ArrowUp' });
    expect(getVisibleFieldSelectOptions()).toEqual(allOptions.slice(8));
  }, 10000);

  it('should hide fields that have no data', () => {
    (useExistingFieldsReader as jest.Mock).mockImplementationOnce(() => {
      return {
        hasFieldData: (dataViewId: string, fieldName: string) => {
          return ['timestamp', 'source'].includes(fieldName);
        },
      };
    });

    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

    const options = getFieldSelectComboBox().options;
    expect(options![1].options!.map(({ label }) => label)).toEqual(['timestampLabel', 'source']);
  });

  it('should indicate fields which are incompatible for the operation of the current column', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({ col1: bytesColumn })}
      />
    );

    const options = getFieldSelectComboBox().options;

    expect(options![0]['data-test-subj']).toEqual('lns-fieldOptionIncompatible-___records___');

    expect(
      options![1].options!.filter(({ label }) => label === 'timestampLabel')[0]['data-test-subj']
    ).toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'memory')[0]['data-test-subj']
    ).not.toContain('Incompatible');
  });

  it('should indicate operations which are incompatible for the field of the current column', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({ col1: bytesColumn })}
      />
    );

    const items = getOperationItems();

    expect(items.find(({ id }) => id === 'min')!['data-test-subj']).not.toContain('incompatible');
    expect(items.find(({ id }) => id === 'date_histogram')!['data-test-subj']).toContain(
      'incompatible'
    );
    // Incompatible because there is no date field
    expect(items.find(({ id }) => id === 'cumulative_sum')!['data-test-subj']).toContain(
      'incompatible'
    );

    expect(items.find(({ id }) => id === 'filters')!['data-test-subj']).not.toContain(
      'incompatible'
    );
  });

  it('should indicate when a transition is invalid due to filterOperations', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col1: {
            label: 'Unique count of source',
            dataType: 'number',
            isBucketed: false,
            operationType: 'unique_count',
            sourceField: 'source,',
          },
        })}
        filterOperations={(meta) => meta.dataType === 'number' && !meta.isBucketed}
      />
    );

    const items = getOperationItems();

    expect(items.find(({ id }) => id === 'min')!['data-test-subj']).toContain('incompatible');
    expect(items.find(({ id }) => id === 'cumulative_sum')!['data-test-subj']).toContain(
      'incompatible'
    );
  });

  it('should not display hidden operation types', () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

    const items = getOperationItems();

    ['math', 'formula', 'static_value'].forEach((hiddenOp) => {
      expect(items.some(({ id }) => id === hiddenOp)).toBe(false);
    });
  });

  it('should indicate that reference-based operations are not compatible when they are incomplete', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          date: {
            label: 'Date',
            dataType: 'date',
            isBucketed: true,
            operationType: 'date_histogram',
            sourceField: '@timestamp',
            params: { interval: 'auto' },
          } as DateHistogramIndexPatternColumn,
          col1: {
            label: 'Counter rate',
            dataType: 'number',
            isBucketed: false,
            operationType: 'counter_rate',
            references: ['ref'],
          },
        })}
      />
    );

    const items = getOperationItems();

    expect(items.find(({ id }) => id === 'differences')!['data-test-subj']).toContain(
      'incompatible'
    );
    expect(items.find(({ id }) => id === 'cumulative_sum')!['data-test-subj']).toContain(
      'incompatible'
    );
    expect(items.find(({ id }) => id === 'moving_average')!['data-test-subj']).toContain(
      'incompatible'
    );
  });

  it('should indicate that reference-based operations are compatible sometimes', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          date: {
            label: 'Date',
            dataType: 'date',
            isBucketed: true,
            operationType: 'date_histogram',
            sourceField: '@timestamp',
            params: { interval: 'auto' },
          } as DateHistogramIndexPatternColumn,
          col1: {
            label: 'Cumulative sum',
            dataType: 'number',
            isBucketed: false,
            operationType: 'cumulative_sum',
            references: ['ref'],
          },
          ref: {
            label: 'Count',
            dataType: 'number',
            isBucketed: false,
            operationType: 'count',
            sourceField: '___records___',
          },
        })}
      />
    );

    const items = getOperationItems();

    expect(items.find(({ id }) => id === 'counter_rate')!['data-test-subj']).toContain(
      'incompatible'
    );

    expect(items.find(({ id }) => id === 'differences')!['data-test-subj']).not.toContain(
      'incompatible'
    );
    expect(items.find(({ id }) => id === 'moving_average')!['data-test-subj']).not.toContain(
      'incompatible'
    );
  });

  it('should keep the operation when switching to another field compatible with this operation', async () => {
    const initialState: FormBasedPrivateState = getStateWithColumns({ col1: bytesColumn });

    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} state={initialState} />);

    await chooseComboBoxOption('indexPattern-dimension-field', 'memory');

    expect(setState.mock.calls[0]).toEqual([
      expect.any(Function),
      { isDimensionComplete: true, forceRender: false },
    ]);
    expect(setState.mock.calls[0][0](defaultProps.state)).toEqual({
      ...initialState,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'sum',
              sourceField: 'memory',
              params: { format: { id: 'bytes' } },
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should switch operations when selecting a field that requires another operation', async () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

    await chooseComboBoxOption('indexPattern-dimension-field', 'source');

    expect(setState.mock.calls[0]).toEqual([
      expect.any(Function),
      { isDimensionComplete: true, forceRender: false },
    ]);
    expect(setState.mock.calls[0][0](defaultProps.state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'terms',
              sourceField: 'source',
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should keep the field when switching to another operation compatible for this field', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({ col1: bytesColumn })}
      />
    );

    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-min'));

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'min',
              sourceField: 'bytes',
              params: { format: { id: 'bytes' }, emptyAsNull: true },
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should not set the state if selecting the currently active operation', () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-date_histogram'));

    expect(setState).not.toHaveBeenCalled();
  });

  it('should update label and custom label flag on label input changes', () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'New Label' } });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function)]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'New Label',
              customLabel: true,
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should not keep the label as long as it is the default label', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({ col1: bytesColumn })}
      />
    );

    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-min'));

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'Minimum of bytes',
            }),
          },
        },
      },
    });
  });

  it('should keep the label on operation change if it is custom', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col1: {
            ...bytesColumn,
            label: 'Custom label',
            customLabel: true,
          },
        })}
      />
    );

    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-min'));

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'Custom label',
              customLabel: true,
            }),
          },
        },
      },
    });
  });

  it('should remove customLabel flag if label is set to default', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col1: {
            ...bytesColumn,
            label: 'Custom label',
            customLabel: true,
          },
        })}
      />
    );

    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Sum of bytes' } });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function)]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'Sum of bytes',
              customLabel: false,
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  describe('transient invalid state', () => {
    it('should set the state if selecting an operation incompatible with the current field', async () => {
      renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );

      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](state)).toEqual({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
            },
            incompleteColumns: {
              col1: { operationType: 'terms' },
            },
          },
        },
      });
    });

    it('should show error message in invalid state', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );

      expect(
        within(screen.getByTestId('indexPattern-field-selection-row')).getByText(
          'This field does not work with the selected function.'
        )
      ).toBeInTheDocument();
    });

    it('should leave error state if a compatible operation is selected', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );

      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-date_histogram'));

      expect(screen.queryAllByTestId('indexPattern-invalid-operation')).toHaveLength(0);
    });

    it('should leave error state if the original operation is re-selected', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );

      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-date_histogram'));

      expect(screen.queryAllByTestId('indexPattern-invalid-operation')).toHaveLength(0);
    });

    it('should leave error state when switching from incomplete state to fieldless operation', async () => {
      renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );
      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-filters'));

      expect(screen.queryAllByTestId('indexPattern-invalid-operation')).toHaveLength(0);
    });

    it('should leave error state when re-selecting the original fieldless function', () => {
      renderEditor(
        <FormBasedDimensionEditorComponent
          {...defaultProps}
          state={getStateWithColumns({
            col1: {
              label: 'Filter',
              dataType: 'string',
              isBucketed: true,
              // Private
              operationType: 'filters',
              params: { filters: [] },
            } as FiltersIndexPatternColumn,
          })}
        />
      );

      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );

      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-filters'));

      expect(screen.queryAllByTestId('indexPattern-invalid-operation')).toHaveLength(0);
    });

    it('should indicate fields compatible with selected operation', async () => {
      renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );

      const options = getFieldSelectComboBox().options;

      expect(options![0]['data-test-subj']).toContain('Incompatible');

      expect(
        options![1].options!.filter(({ label }) => label === 'timestampLabel')[0]['data-test-subj']
      ).toContain('Incompatible');
      expect(
        options![1].options!.filter(({ label }) => label === 'source')[0]['data-test-subj']
      ).not.toContain('Incompatible');
    });

    it('should select compatible operation if field not compatible with selected operation', async () => {
      renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-average'));

      expect(setState.mock.calls[0]).toEqual([
        expect.any(Function),
        { isDimensionComplete: false },
      ]);
      let returnedState: FormBasedPrivateState = {} as FormBasedPrivateState;
      act(() => {
        returnedState = setState.mock.calls[0][0](state);
      });
      expect(returnedState).toEqual({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            incompleteColumns: {
              col2: { operationType: 'average' },
            },
          },
        },
      });

      await chooseComboBoxOption('indexPattern-dimension-field', 'source');

      expect(setState.mock.calls[1][0](state)).toEqual({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col2: expect.objectContaining({
                sourceField: 'source',
                operationType: 'terms',
                // Other parts of this don't matter for this test
              }),
            },
            columnOrder: ['col2', 'col1'],
          },
        },
      });
    });

    it('should keep current state and write incomplete column when transitioning from incomplete reference-based operations to field operation', () => {
      const baseState = getStateWithColumns({
        ...defaultProps.state.layers.first.columns,
        col2: {
          label: 'Counter rate',
          dataType: 'number',
          isBucketed: false,
          operationType: 'counter_rate',
          references: ['ref'],
        },
      });
      renderEditor(
        <FormBasedDimensionEditorComponent {...defaultProps} state={baseState} columnId={'col2'} />
      );

      // Transition to a field operation (incompatible)
      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-average\s+incompatible(?:\s|$)/)
      );

      // Now check that the dimension gets cleaned up on state update
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](state)).toEqual({
        ...baseState,
        layers: {
          first: {
            ...baseState.layers.first,
            incompleteColumns: {
              col2: { operationType: 'average' },
            },
          },
        },
      });
    });

    it('should select the Records field when count is selected on non-existing column', async () => {
      renderEditor(
        <FormBasedDimensionEditorComponent
          {...defaultProps}
          state={getStateWithColumns({})}
          columnId="col2"
        />
      );

      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-count'));

      const newColumnState = setState.mock.calls[0][0](state).layers.first.columns.col2;
      expect(newColumnState.operationType).toEqual('count');
      expect(newColumnState.sourceField).toEqual('___records___');
    });

    it('should indicate document and field compatibility with selected document operation', async () => {
      renderEditor(
        <FormBasedDimensionEditorComponent
          {...defaultProps}
          state={getStateWithColumns({
            col2: {
              dataType: 'number',
              isBucketed: false,
              label: '',
              operationType: 'count',
              sourceField: '___records___',
            },
          })}
          columnId="col2"
        />
      );
      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );
      const options = getFieldSelectComboBox().options;
      expect(options![0]['data-test-subj']).toContain('Incompatible');
      expect(
        options![1].options!.filter(({ label }) => label === 'timestampLabel')[0]['data-test-subj']
      ).toContain('Incompatible');
      expect(
        options![1].options!.filter(({ label }) => label === 'source')[0]['data-test-subj']
      ).not.toContain('Incompatible');
    });

    it('should set datasource state if compatible field is selected for operation', async () => {
      renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);
      fireEvent.click(
        screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-terms\s+incompatible(?:\s|$)/)
      );
      await chooseComboBoxOption('indexPattern-dimension-field', 'source');
      expect(setState.mock.calls.length).toEqual(2);
      expect(setState.mock.calls[1]).toEqual([
        expect.any(Function),
        { isDimensionComplete: true, forceRender: false },
      ]);
      expect(setState.mock.calls[1][0](state)).toEqual({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col1: expect.objectContaining({
                sourceField: 'source',
                operationType: 'terms',
              }),
            },
          },
        },
      });
    });
  });

  describe('time scaling', () => {
    function getProps(colOverrides: Partial<GenericIndexPatternColumn>) {
      return {
        ...defaultProps,
        state: getStateWithColumns({
          datecolumn: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            customLabel: true,
            operationType: 'date_histogram',
            sourceField: 'ts',
            params: {
              interval: '1d',
            },
          } as DateHistogramIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
            ...colOverrides,
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
    }

    it('should default to None if time scaling is not set', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...getProps({})} />);
      openAdvancedOptions();
      expect(screen.queryAllByTestId('indexPattern-time-scaling-enable')).toHaveLength(1);
      expect(
        (screen.getByTestId('indexPattern-time-scaling-unit') as HTMLSelectElement).value
      ).toBe('');
    });

    it('should show current time scaling if set', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...getProps({ timeScale: 'd' })} />);
      openAdvancedOptions();
      expect(
        (screen.getByTestId('indexPattern-time-scaling-unit') as HTMLSelectElement).value
      ).toEqual('d');
    });

    it('should allow to set time scaling initially', () => {
      const props = getProps({});
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      openAdvancedOptions();
      fireEvent.change(screen.getByTestId('indexPattern-time-scaling-unit'), {
        target: { value: 's' },
      });
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: 's',
                label: 'Count of records per second',
              }),
            },
          },
        },
      });
    });

    it('should carry over time scaling to other operation if possible', () => {
      const props = getProps({
        timeScale: 'h',
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-count'));
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: 'h',
                label: 'Count of bytes per hour',
              }),
            },
          },
        },
      });
    });

    it('should not carry over time scaling if the other operation does not support it', () => {
      const props = getProps({
        timeScale: 'h',
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-average'));
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: undefined,
                label: 'Average of bytes',
              }),
            },
          },
        },
      });
    });

    it('should allow to change time scaling', () => {
      const props = getProps({ timeScale: 's', label: 'Count of records per second' });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      openAdvancedOptions();

      fireEvent.change(screen.getByTestId('indexPattern-time-scaling-unit'), {
        target: { value: 'h' },
      });

      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: 'h',
                label: 'Count of records per hour',
              }),
            },
          },
        },
      });
    });

    it('should not adjust label if it is custom', () => {
      const props = getProps({ timeScale: 's', customLabel: true, label: 'My label' });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      fireEvent.change(screen.getByTestId('indexPattern-time-scaling-unit'), {
        target: { value: 'h' },
      });
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: 'h',
                label: 'My label',
              }),
            },
          },
        },
      });
    });
  });

  describe('reduced time range', () => {
    function getProps(colOverrides: Partial<GenericIndexPatternColumn>) {
      return {
        ...defaultProps,
        state: getStateWithColumns({
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
            ...colOverrides,
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
    }

    it('should not show the reduced time range component if reduced time range is not available', () => {
      const props = {
        ...defaultProps,
        state: getStateWithColumns({
          datecolumn: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            customLabel: true,
            operationType: 'date_histogram',
            sourceField: 'ts',
            params: {
              interval: '1d',
            },
          } as DateHistogramIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      openAdvancedOptions();
      expect(screen.queryAllByTestId('indexPattern-dimension-reducedTimeRange-row')).toHaveLength(
        0
      );
    });

    it('should show current reduced time range if set', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...getProps({ reducedTimeRange: '5m' })} />);
      expect(
        getComboBoxProps('indexPattern-dimension-reducedTimeRange').selectedOptions?.[0].value
      ).toEqual('5m');
    });

    it('should allow to set reduced time range initially', async () => {
      const props = getProps({});
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      openAdvancedOptions();
      await chooseComboBoxOption(
        'indexPattern-dimension-reducedTimeRange',
        getComboBoxProps('indexPattern-dimension-reducedTimeRange').options?.find(
          ({ value }) => value === '1h'
        )?.label ?? '1h'
      );
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                reducedTimeRange: '1h',
              }),
            },
          },
        },
      });
    });

    it('should carry over reduced time range to other operation if possible', () => {
      const props = getProps({
        reducedTimeRange: '1d',
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-count'));
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                reducedTimeRange: '1d',
              }),
            },
          },
        },
      });
    });

    it('should allow to change reduced time range', async () => {
      const props = getProps({
        timeShift: '1d',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      const input = within(screen.getByTestId('indexPattern-dimension-reducedTimeRange')).getByRole(
        'combobox'
      );
      await userEvent.click(input);
      fireEvent.change(input, { target: { value: '7m' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                reducedTimeRange: '7m',
              }),
            },
          },
        },
      });
    });

    it('should report a generic error for invalid reduced time range string', () => {
      const props = getProps({
        reducedTimeRange: '5 months',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);

      expect(
        within(screen.getByTestId('indexPattern-dimension-reducedTimeRange'))
          .getByRole('combobox')
          .getAttribute('aria-invalid') === 'true'
      ).toBeTruthy();

      expect(
        within(screen.getByTestId('indexPattern-dimension-reducedTimeRange-row')).getByText(
          'Time range value is not valid.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('time shift', () => {
    function getProps(colOverrides: Partial<GenericIndexPatternColumn>) {
      return {
        ...defaultProps,
        state: getStateWithColumns({
          datecolumn: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            customLabel: true,
            operationType: 'date_histogram',
            sourceField: 'ts',
            params: {
              interval: '1d',
            },
          } as DateHistogramIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
            ...colOverrides,
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
    }

    it('should not show the TimeShift component if time shift is not available', () => {
      const props = {
        ...defaultProps,
        state: getStateWithColumns({
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
      renderEditor(
        <FormBasedDimensionEditorComponent
          {...props}
          indexPatterns={{
            '1': {
              ...props.indexPatterns['1'],
              timeFieldName: undefined,
            },
          }}
        />
      );
      openAdvancedOptions();
      expect(screen.queryAllByTestId('indexPattern-time-shift-enable')).toHaveLength(1);
      expect(screen.queryByTestId('indexPattern-dimension-time-shift')).not.toBeInTheDocument();
    });

    it('should show custom options if time shift is available', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...getProps({})} />);
      expect(screen.queryAllByTestId('indexPattern-time-shift-enable')).toHaveLength(1);
    });

    it('should show current time shift if set', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...getProps({ timeShift: '1d' })} />);
      expect(
        getComboBoxProps('indexPattern-dimension-time-shift').selectedOptions?.[0].value
      ).toEqual('1d');
    });

    it('should allow to set time shift initially', async () => {
      const props = getProps({});
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      openAdvancedOptions();
      await chooseComboBoxOption(
        'indexPattern-dimension-time-shift',
        getComboBoxProps('indexPattern-dimension-time-shift').options?.find(
          ({ value }) => value === '1h'
        )?.label ?? '1h'
      );
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeShift: '1h',
              }),
            },
          },
        },
      });
    });

    it('should carry over time shift to other operation if possible', () => {
      const props = getProps({
        timeShift: '1d',
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-count'));
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeShift: '1d',
              }),
            },
          },
        },
      });
    });

    it('should allow to change time shift', async () => {
      const props = getProps({
        timeShift: '1d',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      const input = within(screen.getByTestId('indexPattern-dimension-time-shift')).getByRole(
        'combobox'
      );
      await userEvent.click(input);
      fireEvent.change(input, { target: { value: '1h' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeShift: '1h',
              }),
            },
          },
        },
      });
    });

    it('should report a generic error for invalid shift string', () => {
      const props = getProps({
        timeShift: '5 months',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);

      expect(
        within(screen.getByTestId('indexPattern-dimension-time-shift'))
          .getByRole('combobox')
          .getAttribute('aria-invalid') === 'true'
      ).toBeTruthy();

      expect(
        within(screen.getByTestId('indexPattern-dimension-time-shift-row')).getByText(
          'Time shift value is not valid.'
        )
      ).toBeInTheDocument();
    });

    it('should mark absolute time shift as invalid', () => {
      const props = getProps({
        timeShift: 'startAt(2022-11-02T00:00:00.000Z)',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);

      expect(
        within(screen.getByTestId('indexPattern-dimension-time-shift'))
          .getByRole('combobox')
          .getAttribute('aria-invalid') === 'true'
      ).toBeTruthy();

      expect(
        within(screen.getByTestId('indexPattern-dimension-time-shift-row')).getByText(
          'Time shift value is not valid.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    function getProps(colOverrides: Partial<GenericIndexPatternColumn>) {
      return {
        ...defaultProps,
        state: getStateWithColumns({
          datecolumn: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            customLabel: true,
            operationType: 'date_histogram',
            sourceField: 'ts',
            params: {
              interval: '1d',
            },
          } as DateHistogramIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
            ...colOverrides,
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
    }

    it('should not show custom options if time scaling is not available', () => {
      renderEditor(
        <FormBasedDimensionEditorComponent
          {...getProps({
            operationType: 'terms',
            sourceField: 'bytes',
            params: {
              orderDirection: 'asc',
              orderBy: { type: 'alphabetical' },
              size: 5,
            },
          } as TermsIndexPatternColumn)}
        />
      );
      expect(screen.queryAllByTestId('indexPattern-advanced-accordion')).toHaveLength(0);
    });

    it('should show custom options if filtering is available', () => {
      renderEditor(<FormBasedDimensionEditorComponent {...getProps({})} />);
      openAdvancedOptions();
      expect(screen.queryAllByTestId('indexPattern-filter-by-enable')).toHaveLength(1);
    });

    it('should show current filter if set', () => {
      renderEditor(
        <FormBasedDimensionEditorComponent
          {...getProps({ filter: { language: 'kuery', query: 'a: b' } })}
        />
      );

      expect(screen.getByTestId('indexPattern-filters-existingFilterTrigger').textContent).toBe(
        `a: b`
      );
    });

    it('should carry over filter to other operation if possible', () => {
      const props = getProps({
        filter: { language: 'kuery', query: 'a: b' },
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      renderEditor(<FormBasedDimensionEditorComponent {...props} />);
      fireEvent.click(screen.getByTestId('lns-indexPatternDimension-count'));
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                filter: { language: 'kuery', query: 'a: b' },
              }),
            },
          },
        },
      });
    });

    it('should allow to change filter', () => {
      const props = getProps({
        filter: { language: 'kuery', query: 'a: b' },
      });

      renderEditor(<FormBasedDimensionEditorComponent {...props} />);

      act(() => {
        const filteringProps = jest.mocked(Filtering).mock.lastCall?.[0];
        if (!filteringProps) throw new Error('Filtering not rendered');
        const { updateLayer, columnId, layer } = filteringProps;

        updateLayer(setFilter(columnId, layer, { language: 'kuery', query: 'c: d' }));
      });

      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      let newState = props.state;
      act(() => {
        newState = setState.mock.calls[0][0](props.state);
      });
      expect(newState).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                filter: { language: 'kuery', query: 'c: d' },
              }),
            },
          },
        },
      });
    });
  });

  it('should render invalid field if field reference is broken', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={{
          ...defaultProps.state,
          layers: {
            first: {
              ...defaultProps.state.layers.first,
              columns: {
                col1: {
                  ...defaultProps.state.layers.first.columns.col1,
                  sourceField: 'nonexistent',
                } as DateHistogramIndexPatternColumn,
              },
            },
          },
        }}
      />
    );

    expect(getFieldSelectComboBox().selectedOptions).toEqual([
      {
        label: 'nonexistent',
        value: { type: 'field', field: 'nonexistent', operationType: 'date_histogram' },
      },
    ]);
  });

  it('should support selecting the operation before the field', async () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} columnId={'col2'} />);
    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-average'));
    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: false }]);
    let returnedState: FormBasedPrivateState = {} as FormBasedPrivateState;
    act(() => {
      returnedState = setState.mock.calls[0][0](defaultProps.state);
    });
    expect(returnedState).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          incompleteColumns: {
            col2: {
              operationType: 'average',
            },
          },
        },
      },
    });

    await chooseComboBoxOption('indexPattern-dimension-field', 'bytes');

    expect(setState.mock.calls[1][0](defaultProps.state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columnOrder: ['col1', 'col2'],
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              operationType: 'average',
              sourceField: 'bytes',
            }),
          },
          incompleteColumns: {},
        },
      },
    });
  });

  it('should select operation directly if only one field is possible', async () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        columnId={'col2'}
        indexPatterns={{
          1: {
            ...defaultProps.indexPatterns['1'],
            fields: defaultProps.indexPatterns['1'].fields.filter(
              (field) => field.name !== 'memory'
            ),
          },
        }}
      />
    );
    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-average'));
    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    let returnedState: FormBasedPrivateState = {} as FormBasedPrivateState;
    act(() => {
      returnedState = setState.mock.calls[0][0](state);
    });
    expect(returnedState).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              sourceField: 'bytes',
              operationType: 'average',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should select operation directly if only document is possible', async () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} columnId={'col2'} />);
    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-count'));
    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    let returnedState: FormBasedPrivateState = {} as FormBasedPrivateState;
    act(() => {
      returnedState = setState.mock.calls[0][0](state);
    });
    expect(returnedState).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              operationType: 'count',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should indicate compatible fields when selecting the operation first', () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-average'));

    const options = getFieldSelectComboBox().options;

    expect(options![0]['data-test-subj']).toContain('Incompatible');

    expect(
      options![1].options!.filter(({ label }) => label === 'timestampLabel')[0]['data-test-subj']
    ).toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'bytes')[0]['data-test-subj']
    ).not.toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'memory')[0]['data-test-subj']
    ).not.toContain('Incompatible');
  });

  it('should indicate document compatibility when document operation is selected', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'count',
            sourceField: '___records___',
          },
        })}
        columnId={'col2'}
      />
    );

    const options = getFieldSelectComboBox().options;

    expect(options![0]['data-test-subj']).not.toContain('Incompatible');
  });

  it('should not update when selecting the current field again', async () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

    const comboBox = getFieldSelectComboBox();

    const option = comboBox.options![1].options!.find(({ label }) => label === 'timestampLabel')!;

    await act(async () => {
      await comboBox.onChange?.([option]);
    });

    expect(setState).not.toHaveBeenCalled();
  });

  it('should show all operations that are not filtered out', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        filterOperations={(op: OperationMetadata) => !op.isBucketed && op.dataType === 'number'}
      />
    );

    const items = getOperationItems();

    expect(items.map(({ id }) => id)).toEqual([
      'average',
      'count',
      'counter_rate',
      'cumulative_sum',
      'differences',
      'last_value',
      'max',
      'median',
      'min',
      'moving_average',
      'percentile',
      'percentile_rank',
      'standard_deviation',
      'sum',
      'unique_count',
      undefined,
    ]);
  });

  it('should add a column on selection of a field', async () => {
    // Prevents field format from being loaded
    setState.mockImplementation(() => {});

    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

    await chooseComboBoxOption('indexPattern-dimension-field', 'bytes');

    expect(setState.mock.calls[0]).toEqual([
      expect.any(Function),
      { isDimensionComplete: true, forceRender: false },
    ]);
    let returnedState: FormBasedPrivateState | null = null;
    act(() => {
      returnedState = setState.mock.calls[0][0](defaultProps.state);
    });

    expect(returnedState).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              operationType: 'range',
              sourceField: 'bytes',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should use helper function when changing the function', () => {
    const initialState: FormBasedPrivateState = getStateWithColumns({
      col1: bytesColumn,
    });
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} state={initialState} />);
    fireEvent.click(screen.getByTestId('lns-indexPatternDimension-min'));

    expect(replaceColumn).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'col1',
        op: 'min',
        field: expect.objectContaining({ name: 'bytes' }),
      })
    );
  });

  it('should keep the latest valid dimension when removing the selection in field combobox', () => {
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);
    act(() => {
      getFieldSelectComboBox().onChange?.([]);
    });

    expect(setState).not.toHaveBeenCalled();
  });

  it('allows custom format', async () => {
    const stateWithNumberCol: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'memory',
      },
    });

    renderEditor(
      <FormBasedDimensionEditorComponent {...defaultProps} state={stateWithNumberCol} />
    );

    await chooseComboBoxOption('indexPattern-dimension-format', 'Bytes (1024)');

    expect(setState.mock.calls[0]).toEqual([expect.any(Function)]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              params: {
                format: { id: 'bytes', params: { decimals: 2 } },
              },
            }),
          },
        },
      },
    });
  });

  it('keeps decimal places while switching', async () => {
    const stateWithNumberCol: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'memory',
        params: {
          format: { id: 'bytes', params: { decimals: 0 } },
        },
      },
    });
    renderEditor(
      <FormBasedDimensionEditorComponent {...defaultProps} state={stateWithNumberCol} />
    );

    await chooseComboBoxOption('indexPattern-dimension-format', 'Default');

    await chooseComboBoxOption('indexPattern-dimension-format', 'Number');

    expect(
      (screen.getByTestId('indexPattern-dimension-formatDecimals') as HTMLInputElement)
        .valueAsNumber
    ).toEqual(0);
  });

  it('allows custom format with number of decimal places', () => {
    const stateWithNumberCol: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'memory',
        params: {
          format: { id: 'bytes', params: { decimals: 2 } },
        },
      },
    });

    renderEditor(
      <FormBasedDimensionEditorComponent {...defaultProps} state={stateWithNumberCol} />
    );

    fireEvent.change(screen.getByTestId('indexPattern-dimension-formatDecimals'), {
      target: { value: '0' },
    });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function)]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              params: {
                format: { id: 'bytes', params: { decimals: 0 } },
              },
            }),
          },
        },
      },
    });
  });

  it('should hide the top level field selector when switching from non-reference to reference', async () => {
    (generateId as jest.Mock).mockReturnValue(`second`);
    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} />);

    expect(screen.queryAllByTestId('mock-reference-editor')).toHaveLength(0);

    fireEvent.click(
      screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-differences\s+incompatible(?:\s|$)/)
    );

    expect(screen.queryAllByTestId('mock-reference-editor')).toHaveLength(1);
  });

  it('should hide the reference editors when switching from reference to non-reference', () => {
    const stateWithReferences: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Differences of (incomplete)',
        dataType: 'number',
        isBucketed: false,
        operationType: 'differences',
        references: ['col2'],
        params: {},
      },
    });

    renderEditor(
      <FormBasedDimensionEditorComponent {...defaultProps} state={stateWithReferences} />
    );

    expect(screen.queryAllByTestId('mock-reference-editor')).toHaveLength(1);

    fireEvent.click(
      screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-average\s+incompatible(?:\s|$)/)
    );

    expect(screen.queryAllByTestId('mock-reference-editor')).toHaveLength(0);
  });

  it('should show a warning when the current dimension is no longer configurable', async () => {
    const stateWithInvalidCol: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Invalid differences',
        dataType: 'number',
        isBucketed: false,
        operationType: 'differences',
        references: ['ref1'],
      },
    });

    renderEditor(
      <FormBasedDimensionEditorComponent {...defaultProps} state={stateWithInvalidCol} />
    );

    const operation = screen.getByTestId('lns-indexPatternDimension-differences');
    expect(operation).toBeDisabled();
    fireEvent.mouseOver(within(operation).getByText('Differences'));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('should remove options to select references when there are no time fields', () => {
    const stateWithoutTime: FormBasedPrivateState = {
      ...getStateWithColumns({
        col1: {
          label: 'Avg',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      }),
    };

    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={stateWithoutTime}
        indexPatterns={{
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            hasRestrictions: false,
            fields: [
              {
                name: 'bytes',
                displayName: 'bytes',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
            getFieldByName: getFieldByNameFactory([
              {
                name: 'bytes',
                displayName: 'bytes',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ]),
            getFormatterForField: () => ({ convertToText: (v: unknown) => v }),
            isPersisted: true,
            spec: {},
          },
        }}
      />
    );

    expect(screen.queryAllByTestId('lns-indexPatternDimension-differences')).toHaveLength(0);
  });

  it('should not show tabs when formula and static_value operations are not available', () => {
    const stateWithInvalidCol: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'memory',
        params: {
          format: { id: 'bytes', params: { decimals: 2 } },
        },
      },
    });

    const props = {
      ...defaultProps,
      filterOperations: jest.fn((op) => {
        // the formula operation will fall into this metadata category
        return !(op.dataType === 'number' && op.scale === 'ratio');
      }),
    };

    renderEditor(<FormBasedDimensionEditorComponent {...props} state={stateWithInvalidCol} />);

    expect(screen.queryByTestId('lens-dimensionTabs') !== null).toBeFalsy();
  });

  it('should show the formula tab when supported', () => {
    const stateWithFormulaColumn: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Formula',
        dataType: 'number',
        isBucketed: false,
        operationType: 'formula',
        references: ['ref1'],
        params: {},
      },
    });

    renderEditor(
      <FormBasedDimensionEditorComponent {...defaultProps} state={stateWithFormulaColumn} />
    );

    expect(screen.getByTestId('lens-dimensionTabs-formula')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('should not show the static_value tab when not supported', () => {
    const stateWithFormulaColumn: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Formula',
        dataType: 'number',
        isBucketed: false,
        operationType: 'formula',
        references: ['ref1'],
        params: {},
      },
    });

    renderEditor(
      <FormBasedDimensionEditorComponent {...defaultProps} state={stateWithFormulaColumn} />
    );

    expect(screen.queryByTestId('lens-dimensionTabs-static_value') !== null).toBeFalsy();
  });

  it('should show the static value tab when supported', () => {
    const staticWithFormulaColumn: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Formula',
        dataType: 'number',
        isBucketed: false,
        operationType: 'formula',
        references: ['ref1'],
        params: {},
      },
    });

    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        supportStaticValue
        state={staticWithFormulaColumn}
      />
    );

    expect(screen.queryByTestId('lens-dimensionTabs-static_value') !== null).toBeTruthy();
  });

  it('should select the quick function tab by default', () => {
    const stateWithNoColumn: FormBasedPrivateState = getStateWithColumns({});

    renderEditor(<FormBasedDimensionEditorComponent {...defaultProps} state={stateWithNoColumn} />);

    expect(screen.getByTestId('lens-dimensionTabs-quickFunctions')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('should select the static value tab when supported by default', () => {
    const stateWithNoColumn: FormBasedPrivateState = getStateWithColumns({});

    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        supportStaticValue
        state={stateWithNoColumn}
      />
    );

    expect(screen.getByTestId('lens-dimensionTabs-static_value')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('should not show tabs and render the static value editor when staticValueOnly is set', () => {
    const stateWithNoColumn: FormBasedPrivateState = getStateWithColumns({});

    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        supportStaticValue
        staticValueOnly
        state={stateWithNoColumn}
      />
    );

    expect(screen.queryByTestId('lens-dimensionTabs') !== null).toBeFalsy();
    expect(screen.queryByTestId('lns-indexPattern-static_value-input') !== null).toBeTruthy();
  });

  it('should not show quick functions for an existing quick function column when staticValueOnly is set', () => {
    renderEditor(
      <FormBasedDimensionEditorComponent {...defaultProps} supportStaticValue staticValueOnly />
    );

    expect(screen.queryByTestId('lens-dimensionTabs') !== null).toBeFalsy();
    expect(screen.queryByTestId('indexPattern-dimension-field') !== null).toBeFalsy();
  });

  it('should not show any tab when formula is in full screen mode', () => {
    const stateWithFormulaColumn: FormBasedPrivateState = getStateWithColumns({
      col1: {
        label: 'Formula',
        dataType: 'number',
        isBucketed: false,
        operationType: 'formula',
        references: ['ref1'],
        params: {},
      },
    });

    renderEditor(
      <FormBasedDimensionEditorComponent
        {...defaultProps}
        state={stateWithFormulaColumn}
        supportStaticValue
        isFullscreen
      />
    );

    expect(screen.queryByTestId('lens-dimensionTabs') !== null).toBeFalsy();
  });

  describe('FormatSelector numeric column detection', () => {
    it('should show FormatSelector when activeData reports the column as numeric', () => {
      renderDimensionPanel({
        state: getStateWithColumns({ col1: lastValueColumn('string') }),
        activeData: {
          first: {
            type: 'datatable',
            columns: [{ id: 'col1', name: 'source', meta: { type: 'number' } }],
            rows: [],
          },
        },
      });

      expect(screen.getByTestId('indexPattern-dimension-format')).toBeInTheDocument();
    });

    it('should hide FormatSelector when activeData reports the column as non-numeric', () => {
      renderDimensionPanel({
        state: getStateWithColumns({ col1: lastValueColumn('number') }),
        activeData: {
          first: {
            type: 'datatable',
            columns: [{ id: 'col1', name: 'source', meta: { type: 'string' } }],
            rows: [],
          },
        },
      });

      expect(screen.queryByTestId('indexPattern-dimension-format')).not.toBeInTheDocument();
    });

    it('should show FormatSelector when selectedColumn dataType is numeric and activeData is not available', () => {
      renderDimensionPanel({
        state: getStateWithColumns({ col1: lastValueColumn('number') }),
      });

      expect(screen.getByTestId('indexPattern-dimension-format')).toBeInTheDocument();
    });

    it('should hide FormatSelector selectedColumn dataType is non numeric and activeData is not available', () => {
      renderDimensionPanel({
        state: getStateWithColumns({ col1: lastValueColumn('string') }),
      });

      expect(screen.queryByTestId('indexPattern-dimension-format')).not.toBeInTheDocument();
    });
  });
});
