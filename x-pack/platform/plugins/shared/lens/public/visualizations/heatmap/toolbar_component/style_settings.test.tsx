/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegendSize } from '@kbn/chart-expressions-common';
import type { FramePublicAPI, HeatmapVisualizationState } from '@kbn/lens-common';
import type { HeatmapGridConfigResult } from '@kbn/expression-heatmap-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { HeatmapStyleSettings } from './style_settings';

type Props = ComponentProps<typeof HeatmapStyleSettings>;

const defaultProps: Props = {
  state: {
    layerId: '1',
    layerType: 'data',
    shape: 'heatmap',
    xAccessor: 'x',
    legend: {
      isVisible: true,
      legendSize: LegendSize.AUTO,
    },
    gridConfig: {
      isXAxisLabelVisible: true,
      isXAxisTitleVisible: false,
    } as HeatmapGridConfigResult,
  } as HeatmapVisualizationState,
  setState: jest.fn(),
  frame: {
    datasourceLayers: {},
  } as FramePublicAPI,
};

const renderComponent = (props: Partial<Props> = {}) => {
  return render(<HeatmapStyleSettings {...defaultProps} {...props} />);
};

const clickButtonByName = async (name: string | RegExp, container?: HTMLElement) => {
  const query = container ? within(container) : screen;
  await userEvent.click(query.getByRole('button', { name }));
};

describe('heatmap style settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have called setState with the proper value of xAxisLabelRotation', async () => {
    renderComponent();

    const orientationGroup = screen.getByRole('group', { name: 'Orientation' });
    await clickButtonByName(/vertical/i, orientationGroup);
    expect(defaultProps.setState).toBeCalledTimes(1);
    expect(defaultProps.setState).toBeCalledWith({
      ...defaultProps.state,
      gridConfig: { ...defaultProps.state.gridConfig, xAxisLabelRotation: -90 },
    });
  });

  it('should hide the orientation group if isXAxisLabelVisible it set to not visible', async () => {
    const { rerender } = renderComponent();

    const orientationGroup = screen.getByRole('group', { name: 'Orientation' });

    expect(orientationGroup).toBeInTheDocument();

    rerender(
      <HeatmapStyleSettings
        {...defaultProps}
        state={{
          ...defaultProps.state,
          gridConfig: { ...defaultProps.state.gridConfig, isXAxisLabelVisible: false },
        }}
      />
    );

    const updatedOrientationGroup = screen.queryByRole('group', { name: 'Orientation' });
    expect(updatedOrientationGroup).not.toBeInTheDocument();
  });

  it('should update xSortPredicate when X-axis sort order is changed to descending (string column)', async () => {
    renderComponent({
      frame: {
        ...defaultProps.frame,
        activeData: {
          '1': {
            type: 'datatable',
            columns: [{ id: 'x', name: 'x', meta: { type: 'string' } }],
            rows: [],
          },
        },
      },
    });

    const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder');
    await userEvent.selectOptions(xAxisSortSelect, 'desc');

    expect(defaultProps.setState).toBeCalledTimes(1);
    expect(defaultProps.setState).toBeCalledWith({
      ...defaultProps.state,
      gridConfig: { ...defaultProps.state.gridConfig, xSortPredicate: 'alphaDesc' },
    });
  });

  it('should update xSortPredicate to numAsc for numeric column when ascending is selected', async () => {
    renderComponent({
      frame: {
        ...defaultProps.frame,
        activeData: {
          '1': {
            type: 'datatable',
            columns: [{ id: 'x', name: 'x', meta: { type: 'number' } }],
            rows: [],
          },
        },
      },
    });

    const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder');
    await userEvent.selectOptions(xAxisSortSelect, 'asc');

    expect(defaultProps.setState).toBeCalledTimes(1);
    expect(defaultProps.setState).toBeCalledWith({
      ...defaultProps.state,
      gridConfig: { ...defaultProps.state.gridConfig, xSortPredicate: 'numAsc' },
    });
  });

  it('should update ySortPredicate when Y-axis sort order is changed', async () => {
    renderComponent();

    const yAxisSortSelect = screen.getByTestId('lnsHeatmapYAxisSortOrder');
    await userEvent.selectOptions(yAxisSortSelect, 'dataIndex');

    expect(defaultProps.setState).toBeCalledTimes(1);
    expect(defaultProps.setState).toBeCalledWith({
      ...defaultProps.state,
      gridConfig: { ...defaultProps.state.gridConfig, ySortPredicate: 'dataIndex' },
    });
  });

  it('should set xSortPredicate to undefined when Auto is selected', async () => {
    renderComponent({
      state: {
        ...defaultProps.state,
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'alphaAsc',
        } as HeatmapGridConfigResult,
      },
    });

    const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder');
    await userEvent.selectOptions(xAxisSortSelect, '');

    expect(defaultProps.setState).toBeCalledTimes(1);
    expect(defaultProps.setState).toBeCalledWith({
      ...defaultProps.state,
      gridConfig: {
        ...defaultProps.state.gridConfig,
        xSortPredicate: undefined,
      },
    });
  });

  it('should display current xSortPredicate value in the select (converts to display value)', () => {
    renderComponent({
      state: {
        ...defaultProps.state,
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'alphaDesc',
        } as HeatmapGridConfigResult,
      },
    });

    const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder') as HTMLSelectElement;
    // Should display 'desc' even though the stored value is 'alphaDesc'
    expect(xAxisSortSelect.value).toBe('desc');
  });

  it('should display numAsc as asc in the select', () => {
    renderComponent({
      state: {
        ...defaultProps.state,
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'numAsc',
        } as HeatmapGridConfigResult,
      },
    });

    const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder') as HTMLSelectElement;
    expect(xAxisSortSelect.value).toBe('asc');
  });

  it('should display current ySortPredicate value in the select', () => {
    renderComponent({
      state: {
        ...defaultProps.state,
        gridConfig: {
          ...defaultProps.state.gridConfig,
          ySortPredicate: 'dataIndex',
        } as HeatmapGridConfigResult,
      },
    });

    const yAxisSortSelect = screen.getByTestId('lnsHeatmapYAxisSortOrder') as HTMLSelectElement;
    expect(yAxisSortSelect.value).toBe('dataIndex');
  });

  describe('functional test: sort predicate changes and data sorting order', () => {
    const testData: Record<string, Datatable> = {
      '1': {
        type: 'datatable',
        columns: [
          { id: 'x', name: 'X Axis', meta: { type: 'string' as const } },
          { id: 'y', name: 'Y Axis', meta: { type: 'number' as const } },
          { id: 'value', name: 'Value', meta: { type: 'number' as const } },
        ],
        rows: [
          { x: 'Zebra', y: 10, value: 5 },
          { x: 'Apple', y: 5, value: 3 },
          { x: 'Banana', y: 20, value: 8 },
          { x: 'Delta', y: 15, value: 7 },
        ],
      },
    };

    it('should correctly set predicates for X-axis string column sorting (ascending and descending)', async () => {
      const setStateMock = jest.fn();
      renderComponent({
        state: {
          ...defaultProps.state,
          xAccessor: 'x',
        },
        setState: setStateMock,
        frame: {
          ...defaultProps.frame,
          activeData: testData,
        },
      });

      const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder');

      // Test ascending sort for string column
      await userEvent.selectOptions(xAxisSortSelect, 'asc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        xAccessor: 'x',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'alphaAsc',
        },
      });

      // Test descending sort for string column
      await userEvent.selectOptions(xAxisSortSelect, 'desc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        xAccessor: 'x',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'alphaDesc',
        },
      });
    });

    it('should correctly set predicates for X-axis numeric column sorting (ascending and descending)', async () => {
      const numericTestData: Record<string, Datatable> = {
        '1': {
          type: 'datatable',
          columns: [
            { id: 'x', name: 'X Axis', meta: { type: 'number' as const } },
            { id: 'y', name: 'Y Axis', meta: { type: 'string' as const } },
            { id: 'value', name: 'Value', meta: { type: 'number' as const } },
          ],
          rows: [
            { x: 100, y: 'A', value: 5 },
            { x: 50, y: 'B', value: 3 },
            { x: 200, y: 'C', value: 8 },
            { x: 150, y: 'D', value: 7 },
          ],
        },
      };

      const setStateMock = jest.fn();
      renderComponent({
        state: {
          ...defaultProps.state,
          xAccessor: 'x',
        },
        setState: setStateMock,
        frame: {
          ...defaultProps.frame,
          activeData: numericTestData,
        },
      });

      const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder');

      // Test ascending sort for numeric column
      await userEvent.selectOptions(xAxisSortSelect, 'asc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        xAccessor: 'x',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'numAsc',
        },
      });

      // Test descending sort for numeric column
      await userEvent.selectOptions(xAxisSortSelect, 'desc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        xAccessor: 'x',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'numDesc',
        },
      });
    });

    it('should correctly set predicates for Y-axis sorting with different options', async () => {
      const setStateMock = jest.fn();
      renderComponent({
        state: {
          ...defaultProps.state,
          yAccessor: 'y',
        },
        setState: setStateMock,
        frame: {
          ...defaultProps.frame,
          activeData: testData,
        },
      });

      const yAxisSortSelect = screen.getByTestId('lnsHeatmapYAxisSortOrder');

      // Test dataIndex predicate
      await userEvent.selectOptions(yAxisSortSelect, 'dataIndex');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        yAccessor: 'y',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          ySortPredicate: 'dataIndex',
        },
      });

      // Test ascending sort for numeric Y-axis column
      await userEvent.selectOptions(yAxisSortSelect, 'asc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        yAccessor: 'y',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          ySortPredicate: 'numAsc',
        },
      });

      // Test descending sort for numeric Y-axis column
      await userEvent.selectOptions(yAxisSortSelect, 'desc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        yAccessor: 'y',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          ySortPredicate: 'numDesc',
        },
      });

      // Test Auto (undefined predicate)
      await userEvent.selectOptions(yAxisSortSelect, '');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        yAccessor: 'y',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          ySortPredicate: undefined,
        },
      });
    });

    it('should correctly handle switching between different X-axis predicates', async () => {
      const setStateMock = jest.fn();
      renderComponent({
        state: {
          ...defaultProps.state,
          xAccessor: 'x',
          gridConfig: {
            ...defaultProps.state.gridConfig,
            xSortPredicate: 'alphaAsc',
          } as HeatmapGridConfigResult,
        },
        setState: setStateMock,
        frame: {
          ...defaultProps.frame,
          activeData: testData,
        },
      });

      const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder');

      // Switch from alphaAsc to alphaDesc
      await userEvent.selectOptions(xAxisSortSelect, 'desc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        xAccessor: 'x',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'alphaDesc',
        },
      });

      // Switch to dataIndex
      await userEvent.selectOptions(xAxisSortSelect, 'dataIndex');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        xAccessor: 'x',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: 'dataIndex',
        },
      });

      // Switch back to Auto
      await userEvent.selectOptions(xAxisSortSelect, '');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        xAccessor: 'x',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          xSortPredicate: undefined,
        },
      });
    });

    it('should correctly handle Y-axis string column sorting', async () => {
      const stringYTestData: Record<string, Datatable> = {
        '1': {
          type: 'datatable',
          columns: [
            { id: 'x', name: 'X Axis', meta: { type: 'number' as const } },
            { id: 'y', name: 'Y Axis', meta: { type: 'string' as const } },
            { id: 'value', name: 'Value', meta: { type: 'number' as const } },
          ],
          rows: [
            { x: 1, y: 'Zebra', value: 5 },
            { x: 2, y: 'Apple', value: 3 },
            { x: 3, y: 'Banana', value: 8 },
          ],
        },
      };

      const setStateMock = jest.fn();
      renderComponent({
        state: {
          ...defaultProps.state,
          yAccessor: 'y',
        },
        setState: setStateMock,
        frame: {
          ...defaultProps.frame,
          activeData: stringYTestData,
        },
      });

      const yAxisSortSelect = screen.getByTestId('lnsHeatmapYAxisSortOrder');

      // Test ascending sort for string Y-axis column
      await userEvent.selectOptions(yAxisSortSelect, 'asc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        yAccessor: 'y',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          ySortPredicate: 'alphaAsc',
        },
      });

      // Test descending sort for string Y-axis column
      await userEvent.selectOptions(yAxisSortSelect, 'desc');
      expect(setStateMock).toHaveBeenLastCalledWith({
        ...defaultProps.state,
        yAccessor: 'y',
        gridConfig: {
          ...defaultProps.state.gridConfig,
          ySortPredicate: 'alphaDesc',
        },
      });
    });

    it('should maintain correct predicates when switching between X and Y axis settings', async () => {
      const setStateMock = jest.fn();
      let currentState: Props['state'] = {
        ...defaultProps.state,
        xAccessor: 'x',
        yAccessor: 'y',
      } as Props['state'];

      const setStateWrapper: Props['setState'] = (newState) => {
        setStateMock(newState);
        // Update currentState to simulate re-render with new state
        currentState = newState as Props['state'];
        rerender(
          <HeatmapStyleSettings
            {...defaultProps}
            state={currentState}
            setState={setStateWrapper}
            frame={{
              ...defaultProps.frame,
              activeData: testData,
            }}
          />
        );
      };

      const { rerender } = renderComponent({
        state: currentState,
        setState: setStateWrapper,
        frame: {
          ...defaultProps.frame,
          activeData: testData,
        },
      });

      // Set X-axis to alphaDesc
      const xAxisSortSelect = screen.getByTestId('lnsHeatmapXAxisSortOrder');
      await userEvent.selectOptions(xAxisSortSelect, 'desc');
      expect(setStateMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          gridConfig: expect.objectContaining({
            xSortPredicate: 'alphaDesc',
          }),
        })
      );

      // Set Y-axis to numAsc
      const yAxisSortSelect = screen.getByTestId('lnsHeatmapYAxisSortOrder');
      await userEvent.selectOptions(yAxisSortSelect, 'asc');
      expect(setStateMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          gridConfig: expect.objectContaining({
            ySortPredicate: 'numAsc',
            xSortPredicate: 'alphaDesc', // Should preserve X-axis predicate
          }),
        })
      );
    });
  });
});
