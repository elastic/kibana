/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Position } from '@elastic/charts';
import type { FramePublicAPI } from '../../../../types';
import { createMockDatasource, createMockFramePublicAPI } from '../../../../mocks';
import { SeriesType, State } from '../../types';
import { VisualOptionsPopover, VisualOptionsPopoverProps } from '.';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { XYDataLayerConfig } from '@kbn/visualizations-plugin/common';

describe('Visual options popover', () => {
  let frame: FramePublicAPI;

  function testState(): State {
    return {
      legend: { isVisible: true, position: Position.Right },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      layers: [
        {
          seriesType: 'bar',
          layerType: LayerTypes.DATA,
          layerId: 'first',
          splitAccessor: 'baz',
          xAccessor: 'foo',
          accessors: ['bar'],
        },
      ],
    };
  }

  beforeEach(() => {
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource('test').publicAPIMock,
    };
  });

  const renderVisualOptionsPopover = (overrideProps?: Partial<VisualOptionsPopoverProps>) => {
    const state = testState();
    return render(
      <VisualOptionsPopover
        datasourceLayers={frame.datasourceLayers}
        setState={jest.fn()}
        state={state}
        {...overrideProps}
      />
    );
  };

  const openAppearancePopover = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Appearance' }));
  };

  it.each<{ seriesType: string; showsMissingValues?: boolean; showsFillOpacity?: boolean }>([
    { seriesType: 'area_percentage_stacked', showsMissingValues: false, showsFillOpacity: true },
    { seriesType: 'bar_horizontal', showsMissingValues: false, showsFillOpacity: false },
    { seriesType: 'line', showsMissingValues: true, showsFillOpacity: false },
  ])(
    `should show settings for seriesTypes: $seriesType`,
    async ({ seriesType, showsMissingValues = false, showsFillOpacity = false }) => {
      const state = testState();
      (state.layers[0] as XYDataLayerConfig).seriesType = seriesType as SeriesType;
      renderVisualOptionsPopover({ state });
      await openAppearancePopover();
      if (showsMissingValues) {
        expect(screen.getByText('Missing values')).toBeInTheDocument();
      } else {
        expect(screen.queryByText('Missing values')).not.toBeInTheDocument();
      }
      if (showsFillOpacity) {
        expect(screen.getAllByTestId('lnsFillOpacity')).toHaveLength(2);
      } else {
        expect(screen.queryAllByTestId('lnsFillOpacity')).toHaveLength(0);
      }
    }
  );
});
