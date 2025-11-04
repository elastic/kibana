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
});
