/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { ESQLVariableType } from '@kbn/esql-types';
import type { TextBasedDimensionEditorProps } from './dimension_editor';
import { TextBasedDimensionEditor } from './dimension_editor';
import type { FieldSelectProps } from './field_select';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');
  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

jest.mock('./fetch_fields_from_esql_expression', () => ({
  fetchFieldsFromESQLExpression: jest.fn(),
}));

let capturedOnChoose: FieldSelectProps['onChoose'] | undefined;

jest.mock('./field_select', () => ({
  FieldSelect: (props: FieldSelectProps) => {
    capturedOnChoose = props.onChoose;
    return <div data-test-subj="text-based-dimension-field" />;
  },
}));

jest.mock('../../form_based/dimension_panel/format_selector', () => ({
  FormatSelector: () => <div data-test-subj="format-selector" />,
}));

const { fetchFieldsFromESQLExpression } = jest.requireMock('./fetch_fields_from_esql_expression');

const waitToLoad = async () =>
  await waitFor(() => {
    expect(fetchFieldsFromESQLExpression).toHaveBeenCalled();
  });

describe('TextBasedDimensionEditor', () => {
  const defaultProps: TextBasedDimensionEditorProps = {
    isFullscreen: false,
    columnId: 'dim1',
    layerId: 'layer1',
    state: {
      layers: {
        layer1: {
          query: { esql: 'FROM my_data' },
          columns: [],
        },
      },
      indexPatternRefs: [],
    },
    setState: jest.fn(),
    indexPatterns: {},
    dateRange: { fromDate: '2023-01-01', toDate: '2023-01-31' },
    expressions: {} as ExpressionsStart,
    esqlVariables: [
      {
        key: 'agent_keyword',
        value: 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1',
        type: ESQLVariableType.VALUES,
      },
    ],
    isMetricDimension: false,
    filterOperations: jest.fn(() => true),
    core: {} as TextBasedDimensionEditorProps['core'],
    groupId: 'rows',
    dimensionGroups: [],
    toggleFullscreen: jest.fn(),
    layerType: undefined,
    supportStaticValue: false,
    enableFormatSelector: true,
  };

  const stateWithColumn = (overrides: Record<string, unknown> = {}) =>
    ({
      ...defaultProps.state,
      layers: {
        layer1: {
          ...defaultProps.state.layers.layer1,
          columns: [
            {
              columnId: 'dim1',
              fieldName: 'bytes',
              label: 'bytes',
              customLabel: false,
              meta: { type: 'number' },
              ...overrides,
            },
          ],
        },
      },
    } as unknown as TextBasedDimensionEditorProps['state']);

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnChoose = undefined;

    fetchFieldsFromESQLExpression.mockResolvedValue({
      columns: [
        { id: 'field1', name: 'Field One', meta: { type: 'string' } },
        { id: 'field2', name: 'Field Two', meta: { type: 'number' } },
      ],
    });
  });

  it('renders correctly and fetches columns on mount', async () => {
    render(<TextBasedDimensionEditor {...defaultProps} />);
    await waitToLoad();

    await waitFor(() => {
      expect(fetchFieldsFromESQLExpression).toHaveBeenCalledWith(
        { esql: 'FROM my_data | limit 0' },
        {},
        { from: defaultProps.dateRange.fromDate, to: defaultProps.dateRange.toDate },
        undefined,
        undefined, // No index patterns
        defaultProps.esqlVariables
      );
    });

    expect(screen.getByTestId('text-based-dimension-field')).toBeInTheDocument();
  });

  it('should set inMetricDimension when selecting a field in a metric dimension', async () => {
    const setState = jest.fn();
    render(
      <TextBasedDimensionEditor {...defaultProps} isMetricDimension={true} setState={setState} />
    );
    await waitToLoad();

    capturedOnChoose!({ type: 'field', field: 'Field Two' });

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        layers: expect.objectContaining({
          layer1: expect.objectContaining({
            columns: [
              expect.objectContaining({
                columnId: 'dim1',
                fieldName: 'Field Two',
                inMetricDimension: true,
              }),
            ],
          }),
        }),
      })
    );
  });

  it('should not set inMetricDimension when selecting a field in a non-metric dimension', async () => {
    const setState = jest.fn();
    render(
      <TextBasedDimensionEditor {...defaultProps} isMetricDimension={false} setState={setState} />
    );
    await waitToLoad();

    capturedOnChoose!({ type: 'field', field: 'Field One' });

    expect(setState).toHaveBeenCalledTimes(1);
    const newState = setState.mock.calls[0][0];
    const newColumn = newState.layers.layer1.columns[0];
    expect(newColumn.columnId).toBe('dim1');
    expect(newColumn.fieldName).toBe('Field One');
    expect(newColumn.inMetricDimension).toBeUndefined();
  });

  describe('NameInput label handling', () => {
    it('should pass empty string value when no custom label is set', async () => {
      render(
        <TextBasedDimensionEditor
          {...defaultProps}
          state={stateWithColumn({ customLabel: false, label: 'bytes' })}
        />
      );
      await waitToLoad();

      const nameInput = screen.getByTestId('name-input');
      expect(nameInput).toHaveValue('');
    });

    it('should pass the custom label as the input value when customLabel is true', async () => {
      render(
        <TextBasedDimensionEditor
          {...defaultProps}
          state={stateWithColumn({ customLabel: true, label: 'My Custom Label' })}
        />
      );
      await waitToLoad();

      const nameInput = screen.getByTestId('name-input');
      expect(nameInput).toHaveValue('My Custom Label');
    });

    it('should update label and set customLabel to true on name input change', async () => {
      const setState = jest.fn();
      const state = stateWithColumn();
      render(<TextBasedDimensionEditor {...defaultProps} state={state} setState={setState} />);
      await waitToLoad();

      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'New Label' } });

      expect(setState).toHaveBeenCalledTimes(1);
      const stateUpdater = setState.mock.calls[0][0];
      const updatedState = stateUpdater(state);
      expect(updatedState.layers.layer1.columns[0]).toMatchObject({
        columnId: 'dim1',
        fieldName: 'bytes',
        label: 'New Label',
        customLabel: true,
      });
    });

    it('should set customLabel to false when label is cleared back to the default', async () => {
      const setState = jest.fn();
      const state = stateWithColumn({ customLabel: true, label: 'Custom' });
      render(<TextBasedDimensionEditor {...defaultProps} state={state} setState={setState} />);
      await waitToLoad();

      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: '' } });

      expect(setState).toHaveBeenCalledTimes(1);
      const stateUpdater = setState.mock.calls[0][0];
      const updatedState = stateUpdater(state);
      expect(updatedState.layers.layer1.columns[0]).toMatchObject({
        columnId: 'dim1',
        fieldName: 'bytes',
        label: 'bytes',
        customLabel: false,
      });
    });
  });

  describe('FormatSelector numeric column detection', () => {
    it('should show FormatSelector when activeData reports the column as numeric', async () => {
      render(
        <TextBasedDimensionEditor
          {...defaultProps}
          state={stateWithColumn({ meta: { type: 'string' } })}
          activeData={{
            layer1: {
              type: 'datatable',
              columns: [{ id: 'dim1', name: 'bytes', meta: { type: 'number' } }],
              rows: [],
            },
          }}
        />
      );
      await waitToLoad();

      expect(screen.getByTestId('format-selector')).toBeInTheDocument();
    });

    it('should hide FormatSelector when activeData reports the column as non-numeric', async () => {
      render(
        <TextBasedDimensionEditor
          {...defaultProps}
          state={stateWithColumn({ meta: { type: 'number' } })}
          activeData={{
            layer1: {
              type: 'datatable',
              columns: [{ id: 'dim1', name: 'bytes', meta: { type: 'string' } }],
              rows: [],
            },
          }}
        />
      );
      await waitToLoad();

      expect(screen.queryByTestId('format-selector')).not.toBeInTheDocument();
    });

    it('should fall back to selectedField.meta when activeData is not available', async () => {
      render(
        <TextBasedDimensionEditor
          {...defaultProps}
          state={stateWithColumn({ meta: { type: 'number' } })}
        />
      );
      await waitToLoad();

      expect(screen.getByTestId('format-selector')).toBeInTheDocument();
    });

    it('should hide FormatSelector for non-numeric field when no activeData', async () => {
      render(
        <TextBasedDimensionEditor
          {...defaultProps}
          state={stateWithColumn({ meta: { type: 'string' } })}
        />
      );
      await waitToLoad();

      expect(screen.queryByTestId('format-selector')).not.toBeInTheDocument();
    });

    it('should hide FormatSelector when enableFormatSelector is set to false', async () => {
      render(
        <TextBasedDimensionEditor
          {...defaultProps}
          state={stateWithColumn({ meta: { type: 'number' } })}
          enableFormatSelector={false}
        />
      );
      await waitToLoad();

      expect(screen.queryByTestId('format-selector')).not.toBeInTheDocument();
    });
  });

  describe('field change behavior', () => {
    it('should clear format params when switching from a numeric to a non-numeric field', async () => {
      const setState = jest.fn();
      const state = stateWithColumn({
        meta: { type: 'number' },
        params: { format: { id: 'number', params: { decimals: 2 } } },
      });
      render(<TextBasedDimensionEditor {...defaultProps} state={state} setState={setState} />);
      await waitToLoad();

      capturedOnChoose!({ type: 'field', field: 'Field One' });

      expect(setState).toHaveBeenCalledTimes(1);
      const newState = setState.mock.calls[0][0];
      const updatedColumn = newState.layers.layer1.columns[0];
      expect(updatedColumn.fieldName).toBe('Field One');
      expect(updatedColumn.params).toBeUndefined();
    });

    it('should preserve format params when switching between numeric fields', async () => {
      const setState = jest.fn();
      const state = stateWithColumn({
        meta: { type: 'number' },
        params: { format: { id: 'number', params: { decimals: 2 } } },
      });
      render(<TextBasedDimensionEditor {...defaultProps} state={state} setState={setState} />);
      await waitToLoad();

      capturedOnChoose!({ type: 'field', field: 'Field Two' });

      expect(setState).toHaveBeenCalledTimes(1);
      const newState = setState.mock.calls[0][0];
      const updatedColumn = newState.layers.layer1.columns[0];
      expect(updatedColumn.fieldName).toBe('Field Two');
      expect(updatedColumn.params).toEqual({
        format: { id: 'number', params: { decimals: 2 } },
      });
    });

    it("should default the label to the new field's name when the previous column didn't have a custom label", async () => {
      const setState = jest.fn();
      const state = stateWithColumn();
      render(<TextBasedDimensionEditor {...defaultProps} state={state} setState={setState} />);
      await waitToLoad();

      capturedOnChoose!({ type: 'field', field: 'Field One' });

      expect(setState).toHaveBeenCalledTimes(1);
      const newState = setState.mock.calls[0][0];
      const updatedColumn = newState.layers.layer1.columns[0];
      expect(updatedColumn.fieldName).toBe('Field One');
      expect(updatedColumn.customLabel).toBe(false);
      expect(updatedColumn.label).toBe('Field One');
    });

    it('should keep the previous label when the previous column had a custom label', async () => {
      const setState = jest.fn();
      const state = stateWithColumn({ customLabel: true, label: 'Custom Label' });
      render(<TextBasedDimensionEditor {...defaultProps} state={state} setState={setState} />);
      await waitToLoad();

      capturedOnChoose!({ type: 'field', field: 'Field One' });

      expect(setState).toHaveBeenCalledTimes(1);
      const newState = setState.mock.calls[0][0];
      const updatedColumn = newState.layers.layer1.columns[0];
      expect(updatedColumn.fieldName).toBe('Field One');
      expect(updatedColumn.customLabel).toBe(true);
      expect(updatedColumn.label).toBe('Custom Label');
    });
  });
});
