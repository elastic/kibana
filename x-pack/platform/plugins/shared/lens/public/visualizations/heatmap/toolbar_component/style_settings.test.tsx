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
import { Position } from '@elastic/charts';
import { LegendSize } from '@kbn/chart-expressions-common';
import type { OperationDescriptor } from '@kbn/lens-common';
import { HeatmapStyleSettings } from './style_settings';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import { CHART_SHAPES, HEATMAP_GRID_FUNCTION, LEGEND_FUNCTION } from '../constants';
import type { HeatmapVisualizationState } from '../types';

type Props = ComponentProps<typeof HeatmapStyleSettings>;

const defaultProps: Props = {
  state: {
    layerId: '1',
    layerType: 'data',
    shape: CHART_SHAPES.HEATMAP,
    xAccessor: 'x',
    legend: {
      isVisible: true,
      position: Position.Right,
      legendSize: LegendSize.AUTO,
      type: LEGEND_FUNCTION,
    },
    gridConfig: {
      type: HEATMAP_GRID_FUNCTION,
      isCellLabelVisible: false,
      isYAxisLabelVisible: true,
      isYAxisTitleVisible: false,
      isXAxisLabelVisible: true,
      isXAxisTitleVisible: false,
    },
  },
  setState: jest.fn(),
  frame: createMockFramePublicAPI(),
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

  it('should disable the x-axis sort order for a time-based horizontal axis', async () => {
    const setState = jest.fn();
    const state: HeatmapVisualizationState = {
      ...defaultProps.state,
      gridConfig: {
        ...defaultProps.state.gridConfig,
        xSortPredicate: 'asc',
      },
    };

    const datasource = createMockDatasource();
    const timeSeriesXAxisOperation: OperationDescriptor = {
      label: 'Date histogram',
      dataType: 'date',
      scale: 'interval',
      isBucketed: true,
      hasTimeShift: false,
      hasReducedTimeRange: false,
    };
    datasource.publicAPIMock.getOperationForColumnId.mockReturnValue(timeSeriesXAxisOperation);

    renderComponent({
      state,
      setState,
      frame: createMockFramePublicAPI({
        datasourceLayers: {
          [state.layerId]: datasource.publicAPIMock,
        },
      }),
    });

    expect(screen.getByTestId('lnsHeatmapXAxisSortOrder')).toBeDisabled();
    expect(screen.getByTestId('lnsHeatmapXAxisSortOrder')).toHaveValue('none');
    expect(screen.getByTestId('lnsHeatmapYAxisSortOrder')).not.toBeDisabled();
    expect(setState).not.toHaveBeenCalled();
  });

  it('should keep the x-axis sort order enabled for non time-based x axis', () => {
    renderComponent();
    expect(screen.getByTestId('lnsHeatmapXAxisSortOrder')).not.toBeDisabled();
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
});
