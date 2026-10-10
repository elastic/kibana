/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Position } from '@elastic/charts';
import { LegendSize } from '@kbn/chart-expressions-common';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { FramePublicAPI } from '@kbn/lens-common';
import type { XYVisualizationState } from '../types';
import { createMockFramePublicAPI, createMockDatasource } from '../../../mocks';
import { XyLegendSettings } from './legend_settings';

describe('XyLegendSettings', () => {
  let frame: FramePublicAPI;

  const testState = (
    legend: Partial<XYVisualizationState['legend']> = {}
  ): XYVisualizationState => ({
    legend: { isVisible: true, position: Position.Bottom, ...legend },
    valueLabels: 'hide',
    preferredSeriesType: 'bar',
    layers: [
      {
        seriesType: 'bar',
        layerType: LayerTypes.DATA,
        layerId: 'first',
        splitAccessors: ['baz'],
        xAccessor: 'foo',
        accessors: ['one'],
      },
    ],
  });

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource('test').publicAPIMock,
    };
  });

  const getWidthSelect = () =>
    screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-haspopup') === 'listbox');

  it.each([Position.Right, Position.Left])(
    'shows Auto width for a %s legend without a size',
    (position) => {
      render(
        <XyLegendSettings frame={frame} setState={jest.fn()} state={testState({ position })} />
      );
      expect(getWidthSelect()).toHaveTextContent('Auto');
    }
  );

  it('shows the saved width for a right legend with a size', () => {
    render(
      <XyLegendSettings
        frame={frame}
        setState={jest.fn()}
        state={testState({ position: Position.Right, legendSize: LegendSize.MEDIUM })}
      />
    );
    expect(getWidthSelect()).toHaveTextContent('Medium');
  });

  it('keeps legendSize unset when moving the legend to the right', () => {
    const setState = jest.fn();
    render(<XyLegendSettings frame={frame} setState={setState} state={testState()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Right' }));

    const [[{ legend }]] = setState.mock.calls;
    expect(legend.position).toBe(Position.Right);
    expect(legend.legendSize).toBeUndefined();
  });
});
