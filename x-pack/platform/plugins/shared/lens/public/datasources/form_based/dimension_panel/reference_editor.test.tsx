/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiComboBox } from '@elastic/eui';
import { renderWithProviders } from '../../../test_utils/test_utils';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type { IUiSettingsClient, HttpSetup } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  OperationMetadata,
  FormBasedLayer,
  LastValueIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-common';
import { createMockedIndexPattern, createMockedIndexPatternWithoutType } from '../mocks';
import type { ReferenceEditorProps } from './reference_editor';
import { ReferenceEditor } from './reference_editor';
import { insertOrReplaceColumn, operationDefinitionMap } from '../operations';
import { FieldSelect } from './field_select';
import type { KqlPluginStart } from '@kbn/kql/public';

jest.mock('@kbn/unified-field-list/src/hooks/use_existing_fields', () => ({
  useExistingFieldsReader: jest.fn(() => {
    return {
      hasFieldData: (dataViewId: string, fieldName: string) => {
        return ['timestamp', 'bytes', 'memory', 'source'].includes(fieldName);
      },
    };
  }),
}));

jest.mock('../operations');

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual<typeof import('@elastic/eui')>('@elastic/eui');
  return {
    ...actual,
    EuiComboBox: jest.fn((props: React.ComponentProps<typeof actual.EuiComboBox>) => (
      <actual.EuiComboBox {...props} />
    )),
  };
});

jest.mock('./field_select', () => {
  const actual = jest.requireActual<typeof import('./field_select')>('./field_select');
  return { ...actual, FieldSelect: jest.fn(actual.FieldSelect) };
});

const getComboBoxProps = (testSubject: string) => {
  const call = jest
    .mocked(EuiComboBox)
    .mock.calls.filter(([props]) => props['data-test-subj'] === testSubject)
    .at(-1);
  if (!call) {
    throw new Error(`Expected combo box ${testSubject}`);
  }
  return call[0];
};

const getFunctionInput = () =>
  within(screen.getByTestId('indexPattern-reference-function')).getByRole('combobox');

describe('reference editor', () => {
  let rerenderEditor:
    | ((setter: Parameters<ReferenceEditorProps['paramEditorUpdater']>[0]) => void)
    | undefined;
  let paramEditorUpdater: jest.MockedFunction<ReferenceEditorProps['paramEditorUpdater']>;

  const renderEditor = (element: React.ReactElement<ReferenceEditorProps>) => {
    let props = element.props;
    const { rerender } = renderWithProviders(element);
    rerenderEditor = (setter) => {
      const nextLayer =
        typeof setter === 'function'
          ? setter(props.layer)
          : 'columns' in setter
          ? setter
          : { ...props.layer, columns: { ...props.layer.columns, [props.columnId]: setter } };
      props = { ...props, layer: nextLayer };
      rerender(<ReferenceEditor {...props} />);
    };
  };

  const layer = {
    indexPatternId: '1',
    columnOrder: ['ref'],
    columns: {
      ref: {
        label: 'Top values of dest',
        dataType: 'string',
        isBucketed: true,
        operationType: 'terms',
        sourceField: 'dest',
        params: { size: 5, orderBy: { type: 'alphabetical' }, orderDirection: 'desc' },
      } as TermsIndexPatternColumn,
    },
  };
  function getDefaultArgs() {
    return {
      layer,
      column: layer.columns.ref,
      onChooseField: jest.fn(),
      onChooseFunction: jest.fn(),
      onDeleteColumn: jest.fn(),
      onResetIncomplete: jest.fn(),
      columnId: 'ref',
      paramEditorUpdater,
      selectionStyle: 'full' as const,
      currentIndexPattern: createMockedIndexPattern(),
      dateRange: { fromDate: 'now-1d', toDate: 'now' },
      storage: {} as IStorageWrapper,
      uiSettings: {} as IUiSettingsClient,
      http: {} as HttpSetup,
      data: {} as DataPublicPluginStart,
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      kql: {} as KqlPluginStart,
      dataViews: dataViewPluginMocks.createStartContract(),
      dimensionGroups: [],
      isFullscreen: false,
      toggleFullscreen: jest.fn(),
      setIsCloseable: jest.fn(),
      layerId: '1',
      operationDefinitionMap,
    };
  }

  beforeEach(() => {
    rerenderEditor = undefined;
    paramEditorUpdater = jest.fn((setter) => {
      rerenderEditor?.(setter);
    });

    jest.clearAllMocks();
  });

  it('should indicate that all functions and available fields are compatible in the empty state', () => {
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.dataType === 'number',
        }}
        column={undefined}
      />
    );

    // Inspect every option, including entries outside EUI's virtualized menu viewport.
    const functions = getComboBoxProps('indexPattern-reference-function').options;

    expect(functions).not.toContainEqual(
      expect.objectContaining({ 'data-test-subj': expect.stringContaining('Incompatible') })
    );

    const fields = getComboBoxProps('indexPattern-dimension-field').options;

    expect(fields![0].options).not.toContainEqual(
      expect.objectContaining({ 'data-test-subj': expect.stringContaining('Incompatible') })
    );
    expect(fields![1].options).not.toContainEqual(
      expect.objectContaining({ 'data-test-subj': expect.stringContaining('Incompatible') })
    );
  });

  it('should indicate fields that are incompatible with the current', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
    } as FormBasedLayer;
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => !meta.isBucketed,
        }}
      />
    );

    fireEvent.click(
      within(screen.getByTestId('indexPattern-dimension-field')).getByRole('combobox')
    );
    expect(screen.getByTestId('lns-fieldOptionIncompatible-timestamp')).toHaveTextContent(
      'timestampLabel'
    );
    expect(screen.getByTestId('lns-fieldOptionIncompatible-source')).toHaveTextContent('source');
    expect(screen.getByTestId('lns-fieldOption-memory')).toHaveTextContent('memory');
  });

  it('should indicate functions that are incompatible with the current', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Unique count of dest',
          dataType: 'string',
          isBucketed: false,
          operationType: 'unique_count',
          sourceField: 'dest',
        },
      },
    } as FormBasedLayer;
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => !meta.isBucketed,
        }}
      />
    );

    fireEvent.click(getFunctionInput());
    expect(screen.getByTestId(/(?:^|\s)lns-indexPatternDimension-average(?:\s|$)/)).toHaveAttribute(
      'data-test-subj',
      'lns-indexPatternDimension-average incompatible'
    );
  });

  it('should not update when selecting the same operation', async () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
    } as FormBasedLayer;
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.dataType === 'number',
        }}
      />
    );

    await userEvent.click(getFunctionInput());
    fireEvent.click(
      within(await screen.findByRole('listbox')).getByRole('option', { name: 'Average' })
    );
    expect(insertOrReplaceColumn).not.toHaveBeenCalled();
  });

  it('should keep the field when replacing an existing reference with a compatible function', async () => {
    const onChooseFunction = jest.fn();
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
    } as FormBasedLayer;
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => meta.dataType === 'number',
        }}
        onChooseFunction={onChooseFunction}
      />
    );

    await userEvent.click(getFunctionInput());
    fireEvent.click(
      within(await screen.findByRole('listbox')).getByRole('option', { name: 'Maximum' })
    );

    expect(onChooseFunction).toHaveBeenCalledWith(
      'max',
      expect.objectContaining({
        name: 'bytes',
      })
    );
  });

  it('should transition to another function with incompatible field', async () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Unique count of dest',
          dataType: 'string',
          isBucketed: false,
          operationType: 'unique_count',
          sourceField: 'dest',
        },
      },
    } as FormBasedLayer;
    const onChooseFunction = jest.fn();
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        onChooseFunction={onChooseFunction}
        column={newLayer.columns.ref}
        layer={newLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    await userEvent.click(getFunctionInput());
    fireEvent.change(getFunctionInput(), { target: { value: 'Average' } });
    fireEvent.click(
      within(await screen.findByRole('listbox')).getByTestId(
        /(?:^|\s)lns-indexPatternDimension-average(?:\s|$)/
      )
    );

    expect(onChooseFunction).toHaveBeenCalledWith('average', undefined);
  });

  it("should show the sub-function as invalid if there's no field compatible with it", () => {
    // This may happen for saved objects after changing the type of a field
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
    } as FormBasedLayer;
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        currentIndexPattern={createMockedIndexPatternWithoutType('number')}
        column={newLayer.columns.ref}
        layer={newLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(getFunctionInput()).toHaveAttribute('aria-invalid', 'true');
    expect(getFunctionInput()).toHaveValue('Average');
    expect(getComboBoxProps('indexPattern-reference-function').selectedOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          'data-test-subj': 'lns-indexPatternDimension-average incompatible',
          label: 'Average',
          value: 'average',
        }),
      ])
    );
  });

  it('should not display hidden sub-function types', () => {
    // This may happen for saved objects after changing the type of a field
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        column={undefined}
        currentIndexPattern={createMockedIndexPatternWithoutType('number')}
        validation={{
          input: ['field', 'fullReference', 'managedReference'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(getFunctionInput()).toHaveAttribute('aria-invalid', 'true');

    expect(getComboBoxProps('indexPattern-reference-function').selectedOptions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'math' })])
    );
    expect(getComboBoxProps('indexPattern-reference-function').selectedOptions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'formula' })])
    );
  });

  it('should hide the function selector when using a field-only selection style', () => {
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        column={undefined}
        selectionStyle={'field' as const}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(screen.queryByTestId('indexPattern-reference-function')).not.toBeInTheDocument();
  });

  it('should pass the incomplete operation info to FieldSelect', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
      incompleteColumns: {
        ref: { operationType: 'max' },
      },
    } as FormBasedLayer;
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        incompleteColumn={newLayer.incompleteColumns?.ref}
        column={newLayer.columns.ref}
        layer={newLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(jest.mocked(FieldSelect).mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        fieldIsInvalid: true,
        selectedField: 'bytes',
        selectedOperationType: 'average',
        incompleteOperation: 'max',
        markAllFieldsCompatible: false,
      })
    );
    expect(
      within(screen.getByTestId('indexPattern-dimension-field')).getByRole('combobox')
    ).toHaveValue('bytes');
  });

  it('should pass the incomplete field info to FieldSelect', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      },
      incompleteColumns: {
        ref: { sourceField: 'timestamp' },
      },
    } as FormBasedLayer;
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        incompleteColumn={newLayer.incompleteColumns?.ref}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(jest.mocked(FieldSelect).mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        fieldIsInvalid: false,
        selectedField: 'timestamp',
        selectedOperationType: 'average',
        incompleteOperation: undefined,
      })
    );
    expect(
      within(screen.getByTestId('indexPattern-dimension-field')).getByRole('combobox')
    ).toHaveValue('timestampLabel');
  });

  it('should show the FieldSelect as invalid in the empty state for field-only forms', () => {
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        column={undefined}
        selectionStyle="field"
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(jest.mocked(FieldSelect).mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        fieldIsInvalid: true,
        selectedField: undefined,
        selectedOperationType: undefined,
        incompleteOperation: undefined,
        markAllFieldsCompatible: true,
      })
    );
    expect(
      within(screen.getByTestId('indexPattern-dimension-field')).getByRole('combobox')
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('should show the FieldSelect as invalid if the selected field is missing', () => {
    const newLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Average of missing',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'missing',
        },
      },
    } as FormBasedLayer;
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        layer={newLayer}
        column={newLayer.columns.ref}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(jest.mocked(FieldSelect).mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        fieldIsInvalid: true,
        selectedField: 'missing',
        selectedOperationType: 'average',
        incompleteOperation: undefined,
        markAllFieldsCompatible: false,
      })
    );
    const fieldInput = within(screen.getByTestId('indexPattern-dimension-field')).getByRole(
      'combobox'
    );
    expect(fieldInput).toHaveValue('missing');
    expect(fieldInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('should show the ParamEditor for functions that offer one', () => {
    const lastValueLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Last value of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'last_value',
          sourceField: 'bytes',
          params: {
            sortField: 'timestamp',
          },
        } as LastValueIndexPatternColumn,
      },
    };
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        column={lastValueLayer.columns.ref}
        layer={lastValueLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(screen.getByTestId('lns-indexPattern-lastValue-sortField')).toBeInTheDocument();
  });

  it('should hide the ParamEditor for incomplete functions', () => {
    const lastValueLayer = {
      indexPatternId: '1',
      columnOrder: ['ref'],
      columns: {
        ref: {
          label: 'Last value of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'last_value',
          sourceField: 'bytes',
          params: {
            sortField: 'timestamp',
          },
        } as LastValueIndexPatternColumn,
      },
      incompleteColumns: {
        ref: { operationType: 'max' },
      },
    };
    renderEditor(
      <ReferenceEditor
        {...getDefaultArgs()}
        incompleteColumn={lastValueLayer.incompleteColumns.ref}
        column={lastValueLayer.columns.ref}
        layer={lastValueLayer}
        validation={{
          input: ['field'],
          validateMetadata: (meta: OperationMetadata) => true,
        }}
      />
    );

    expect(screen.queryByTestId('lns-indexPattern-lastValue-sortField')).not.toBeInTheDocument();
  });
});
