/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { Toolbar } from './toolbar';
import { MetricVisualizationState } from './visualization';
import { createMockFramePublicAPI } from '../../mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

describe('metric toolbar', () => {
  const palette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: 'foo',
    params: {
      rangeType: 'percent',
    },
  };

  const fullState: Required<MetricVisualizationState> = {
    layerId: 'first',
    layerType: 'data',
    metricAccessor: 'metric-col-id',
    secondaryMetricAccessor: 'secondary-metric-col-id',
    maxAccessor: 'max-metric-col-id',
    breakdownByAccessor: 'breakdown-col-id',
    collapseFn: 'sum',
    subtitle: 'subtitle',
    secondaryPrefix: 'extra-text',
    progressDirection: 'vertical',
    maxCols: 5,
    color: 'static-color',
    icon: 'compute',
    palette,
    showBar: true,
    trendlineLayerId: 'second',
    trendlineLayerType: 'metricTrendline',
    trendlineMetricAccessor: 'trendline-metric-col-id',
    trendlineSecondaryMetricAccessor: 'trendline-secondary-metric-col-id',
    trendlineTimeAccessor: 'trendline-time-col-id',
    trendlineBreakdownByAccessor: 'trendline-breakdown-col-id',
  };

  const frame = createMockFramePublicAPI();

  const mockSetState = jest.fn();

  const renderToolbar = (state: MetricVisualizationState) => {
    return { ...render(<Toolbar state={state} setState={mockSetState} frame={frame} />) };
  };

  afterEach(() => mockSetState.mockClear());

  describe('text options', () => {
    it('sets a subtitle', async () => {
      renderToolbar({
        ...fullState,
        breakdownByAccessor: undefined,
      });
      const textOptionsButton = screen.getByTestId('lnsLabelsButton');
      textOptionsButton.click();

      const newSubtitle = 'new subtitle hey';
      const subtitleField = screen.getByDisplayValue('subtitle');
      // cannot use userEvent because the element cannot be clicked on
      fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 1' } });
      await waitFor(() => expect(mockSetState).toHaveBeenCalled());
      fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 2' } });
      await waitFor(() => expect(mockSetState).toHaveBeenCalledTimes(2));
      fireEvent.change(subtitleField, { target: { value: newSubtitle + ' 3' } });
      await waitFor(() => expect(mockSetState).toHaveBeenCalledTimes(3));
      expect(mockSetState.mock.calls.map(([state]) => state.subtitle)).toMatchInlineSnapshot(`
        Array [
          "new subtitle hey 1",
          "new subtitle hey 2",
          "new subtitle hey 3",
        ]
      `);
    });

    it('hides text options when has breakdown by', () => {
      renderToolbar({
        ...fullState,
        breakdownByAccessor: 'some-accessor',
      });
      expect(screen.queryByTestId('lnsLabelsButton')).not.toBeInTheDocument();
    });
  });
});
