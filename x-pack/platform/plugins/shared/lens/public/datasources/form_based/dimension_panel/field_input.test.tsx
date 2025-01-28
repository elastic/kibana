/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { EuiComboBox } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import { GenericOperationDefinition } from '../operations';
import {
  averageOperation,
  countOperation,
  derivativeOperation,
  FieldBasedIndexPatternColumn,
  termsOperation,
  staticValueOperation,
  minOperation,
  FieldInputProps,
} from '../operations/definitions';
import { FieldInput, getErrorMessage } from './field_input';
import { createMockedIndexPattern, createMockedIndexPatternWithAdditionalFields } from '../mocks';
import { getOperationSupportMatrix } from '.';
import { GenericIndexPatternColumn, FormBasedLayer, FormBasedPrivateState } from '../types';
import { ReferenceBasedIndexPatternColumn } from '../operations/definitions/column_types';
import { FieldSelect } from './field_select';
import { IndexPattern, VisualizationDimensionGroupConfig } from '../../../types';

function getStringBasedOperationColumn(field = 'source') {
  return {
    label: `Top value of ${field}`,
    dataType: 'string',
    isBucketed: true,
    operationType: 'terms',
    params: {
      orderBy: { type: 'alphabetical' },
      size: 3,
      orderDirection: 'asc',
    },
    sourceField: field,
  } as FieldBasedIndexPatternColumn;
}

function getReferenceBasedOperationColumn(
  subOp = 'average',
  field = 'bytes'
): ReferenceBasedIndexPatternColumn {
  return {
    label: `Difference of ${subOp} of ${field}`,
    dataType: 'number',
    operationType: 'differences',
    isBucketed: false,
    references: ['colX'],
    scale: 'ratio',
  };
}

function getManagedBasedOperationColumn(): ReferenceBasedIndexPatternColumn {
  return {
    label: 'Static value: 100',
    dataType: 'number',
    operationType: 'static_value',
    isBucketed: false,
    scale: 'ratio',
    params: { value: 100 },
    references: [],
  } as ReferenceBasedIndexPatternColumn;
}

function getCountOperationColumn(): GenericIndexPatternColumn {
  return {
    label: 'Count',
    dataType: 'number',
    isBucketed: false,
    sourceField: '___records___',
    operationType: 'count',
  };
}
const defaultDataView = createMockedIndexPattern();
const defaultProps = {
  columnId: 'col1',
  layer: getLayer(),
  operationSupportMatrix: getDefaultOperationSupportMatrix(getLayer(), 'col1'),
  indexPattern: defaultDataView,
  currentFieldIsInvalid: false,
  incompleteField: null,
  incompleteOperation: undefined,
  incompleteParams: {},
  dimensionGroups: [] as VisualizationDimensionGroupConfig[],
  groupId: 'any',
  updateLayer: jest.fn(),
  operationDefinitionMap: {
    terms: termsOperation,
    average: averageOperation,
    count: countOperation,
    differences: derivativeOperation,
    staticValue: staticValueOperation,
    min: minOperation,
  } as unknown as Record<string, GenericOperationDefinition>,
};

function getLayer(col1: GenericIndexPatternColumn = getStringBasedOperationColumn()) {
  return {
    indexPatternId: defaultDataView.id,
    columnOrder: ['col1', 'col2'],
    columns: {
      col1,
      col2: getCountOperationColumn(),
    },
  };
}
function getDefaultOperationSupportMatrix(
  layer: FormBasedLayer,
  columnId: string,
  indexPattern?: IndexPattern
) {
  return getOperationSupportMatrix({
    state: {
      layers: { layer1: layer },
    } as unknown as FormBasedPrivateState,
    layerId: 'layer1',
    filterOperations: () => true,
    columnId,
    indexPatterns: {
      [defaultDataView.id]: indexPattern ?? defaultDataView,
    },
  });
}

const renderFieldInput = (
  overrideProps?: Partial<FieldInputProps<FieldBasedIndexPatternColumn>>
) => {
  return render(<FieldInput {...defaultProps} {...overrideProps} />);
};

const waitForComboboxToClose = async () =>
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());

const getErrorElement = (container: HTMLElement) => container.querySelector('.euiFormErrorText');
const getLabelElement = () =>
  screen.getByTestId('indexPattern-field-selection-row').querySelector('label');

describe('FieldInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render a field select box', () => {
    renderFieldInput();
    expect(screen.getByTestId('indexPattern-dimension-field')).toBeInTheDocument();
  });

  it('should render an error message when incomplete operation is on', () => {
    const { container } = renderFieldInput({
      incompleteOperation: 'terms',
      selectedColumn: getStringBasedOperationColumn(),
    });

    expect(getErrorElement(container)).toHaveTextContent(
      'This field does not work with the selected function.'
    );
    expect(getLabelElement()).toBeInvalid();
  });

  it.each([
    ['reference-based operation', getReferenceBasedOperationColumn()],
    ['managed references operation', getManagedBasedOperationColumn()],
  ])(
    'should mark the field as invalid but not show any error message for a %s when only an incomplete column is set',
    (_, col: ReferenceBasedIndexPatternColumn) => {
      const { container } = renderFieldInput({
        incompleteOperation: 'terms',
      });

      expect(getLabelElement()).toBeInvalid();
      expect(getErrorElement(container)).not.toBeInTheDocument();
    }
  );

  it.each([
    ['reference-based operation', getReferenceBasedOperationColumn()],
    ['managed references operation', getManagedBasedOperationColumn()],
  ])(
    'should mark the field as invalid but and show an error message for a %s when an incomplete column is set and an existing column is selected',
    (_, col: ReferenceBasedIndexPatternColumn) => {
      const { container } = renderFieldInput({
        incompleteOperation: 'terms',
        selectedColumn: getStringBasedOperationColumn(),
      });
      expect(getErrorElement(container)).toHaveTextContent(
        'This field does not work with the selected function.'
      );
    }
  );

  it('should render an error message for invalid fields', () => {
    const { container } = renderFieldInput({
      currentFieldIsInvalid: true,
    });
    expect(getLabelElement()).toBeInvalid();
    expect(getErrorElement(container)).toHaveTextContent(
      'Invalid field. Check your data view or pick another field.'
    );
  });

  it('should render a help message when passed and no errors are found', () => {
    const helpMessage = 'My help message';
    renderFieldInput({ helpMessage });
    expect(screen.getByTestId('indexPattern-field-selection-row')).toHaveTextContent(
      `Field ${helpMessage}`
    );
  });

  it('should update the layer on field selection', async () => {
    renderFieldInput({ selectedColumn: getStringBasedOperationColumn() });
    await userEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByTestId('lns-fieldOption-bytes'));
    expect(defaultProps.updateLayer).toHaveBeenCalled();
    await waitForComboboxToClose();
  });

  it('should prioritize errors over help messages', () => {
    const helpMessage = 'My help message';
    renderFieldInput({ helpMessage, currentFieldIsInvalid: true });
    expect(screen.getByTestId('indexPattern-field-selection-row')).not.toHaveTextContent(
      `Field ${helpMessage}`
    );
  });

  it('should not trigger when the same selected field is selected again', async () => {
    renderFieldInput({ selectedColumn: getStringBasedOperationColumn() });
    await userEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByTestId('lns-fieldOption-source'));

    await waitForComboboxToClose();
    expect(defaultProps.updateLayer).not.toHaveBeenCalled();
  });

  it('should prioritize incomplete fields over selected column field to display', () => {
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={defaultProps.updateLayer}
        operationSupportMatrix={operationSupportMatrix}
        incompleteField={'dest'}
        selectedColumn={getStringBasedOperationColumn()}
      />
    );

    expect(instance.find(EuiComboBox).first().prop('selectedOptions')).toEqual([
      {
        label: 'dest',
        value: { type: 'field', field: 'dest' },
      },
    ]);
  });

  it('should forward the onDeleteColumn function', () => {
    const onDeleteColumn = jest.fn();
    const layer = getLayer();
    const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
    const instance = mount(
      <FieldInput
        {...defaultProps}
        layer={layer}
        columnId={'col1'}
        updateLayer={defaultProps.updateLayer}
        operationSupportMatrix={operationSupportMatrix}
        onDeleteColumn={onDeleteColumn}
      />
    );

    act(() => {
      instance.find(EuiComboBox).first().prop('onChange')!([]);
    });

    expect(onDeleteColumn).toHaveBeenCalled();
    expect(defaultProps.updateLayer).not.toHaveBeenCalled();
  });

  describe('time series group', () => {
    function getLayerWithTSDBMetric() {
      const layer = getLayer();
      layer.columns.col2 = {
        label: 'Min of TSDB counter',
        dataType: 'number',
        isBucketed: false,
        sourceField: 'bytes_counter',
        operationType: 'min',
      };
      return layer;
    }
    it('should not render the time dimension category if it has tsdb metric column but the group is not a breakdown', () => {
      const layer = getLayerWithTSDBMetric();
      const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
      const instance = mount(
        <FieldInput
          {...defaultProps}
          indexPattern={createMockedIndexPatternWithAdditionalFields([
            {
              name: 'bytes_counter',
              displayName: 'bytes_counter',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
          ])}
          layer={layer}
          columnId={'col1'}
          updateLayer={defaultProps.updateLayer}
          operationSupportMatrix={operationSupportMatrix}
        />
      );

      expect(instance.find(FieldSelect).prop('showTimeSeriesDimensions')).toBeFalsy();
    });

    it('should render the time dimension category if it has tsdb metric column and the group is a breakdown one', () => {
      const layer = getLayerWithTSDBMetric();
      const operationSupportMatrix = getDefaultOperationSupportMatrix(layer, 'col1');
      const instance = mount(
        <FieldInput
          {...defaultProps}
          indexPattern={createMockedIndexPatternWithAdditionalFields([
            {
              name: 'bytes_counter',
              displayName: 'bytes_counter',
              type: 'number',
              aggregatable: true,
              searchable: true,
              timeSeriesMetric: 'counter',
            },
          ])}
          dimensionGroups={defaultProps.dimensionGroups.concat([
            {
              groupId: 'breakdown',
              isBreakdownDimension: true,
            } as VisualizationDimensionGroupConfig,
          ])}
          groupId="breakdown"
          layer={layer}
          columnId={'col1'}
          updateLayer={defaultProps.updateLayer}
          operationSupportMatrix={operationSupportMatrix}
        />
      );

      expect(instance.find(FieldSelect).prop('showTimeSeriesDimensions')).toBeTruthy();
    });
  });
});

describe('getErrorMessage', () => {
  it.each(['none', 'field', 'fullReference', 'managedReference'] as const)(
    'should return no error for no column passed for %s type of operation',
    (type) => {
      expect(getErrorMessage(undefined, false, type, false)).toBeUndefined();
    }
  );

  it('should return the invalid message', () => {
    expect(getErrorMessage(undefined, false, 'none', true)).toBe(
      'Invalid field. Check your data view or pick another field.'
    );
  });

  it('should ignore the invalid flag when an incomplete column is passed', () => {
    expect(
      getErrorMessage(
        { operationType: 'terms', label: 'Top values of X', dataType: 'string', isBucketed: true },
        true,
        'field',
        true
      )
    ).not.toBe('Invalid field. Check your data view or pick another field.');
  });

  it('should tell the user to change field if incomplete with an incompatible field', () => {
    expect(
      getErrorMessage(
        { operationType: 'terms', label: 'Top values of X', dataType: 'string', isBucketed: true },
        true,
        'field',
        false
      )
    ).toBe('This field does not work with the selected function.');
  });
});
