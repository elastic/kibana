/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { HeatmapToolbar } from './toolbar_component';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { FramePublicAPI } from '../../types';
import { HeatmapVisualizationState } from './types';
import { HeatmapGridConfigResult } from '@kbn/expression-heatmap-plugin/common';

type Props = ComponentProps<typeof HeatmapToolbar>;

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
  return render(<HeatmapToolbar {...defaultProps} {...props} />);
};

const clickButtonByName = async (name: string | RegExp, container?: HTMLElement) => {
  const query = container ? within(container) : screen;
  await userEvent.click(query.getByRole('button', { name }));
};

const clickHorizontalAxisButton = async () => {
  await clickButtonByName(/horizontal axis/i);
};

describe('HeatmapToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have called setState with the proper value of xAxisLabelRotation', async () => {
    renderComponent();
    await clickHorizontalAxisButton();

    const orientationGroup = screen.getByRole('group', { name: /orientation/i });
    await clickButtonByName(/vertical/i, orientationGroup);
    expect(defaultProps.setState).toBeCalledTimes(1);
    expect(defaultProps.setState).toBeCalledWith({
      ...defaultProps.state,
      gridConfig: { ...defaultProps.state.gridConfig, xAxisLabelRotation: -90 },
    });
  });

  it('should hide the orientation group if isXAxisLabelVisible it set to not visible', async () => {
    const { rerender } = renderComponent();
    await clickHorizontalAxisButton();

    const orientationGroup = screen.getByRole('group', { name: /orientation/i });
    expect(orientationGroup).toBeInTheDocument();

    rerender(
      <HeatmapToolbar
        {...defaultProps}
        state={{
          ...defaultProps.state,
          gridConfig: { ...defaultProps.state.gridConfig, isXAxisLabelVisible: false },
        }}
      />
    );
    await clickHorizontalAxisButton();

    const updatedOrientationGroup = screen.queryByRole('group', { name: /orientation/i });
    expect(updatedOrientationGroup).not.toBeInTheDocument();
  });
});
