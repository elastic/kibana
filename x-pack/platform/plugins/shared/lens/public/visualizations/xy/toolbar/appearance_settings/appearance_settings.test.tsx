/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Position } from '@elastic/charts';
import type { FramePublicAPI, XYDataLayerConfig, XYState, SeriesType } from '@kbn/lens-common';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { render, screen } from '@testing-library/react';

import { createMockDatasource, createMockFramePublicAPI } from '../../../../mocks';
import { XyAppearanceSettings } from './appearance_settings';

describe('Appearance settings', () => {
  let frame: FramePublicAPI;

  function testState(): XYState {
    return {
      legend: { isVisible: true, position: Position.Right },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      layers: [
        {
          seriesType: 'bar',
          layerType: LayerTypes.DATA,
          layerId: 'first',
          splitAccessors: ['baz'],
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

  const renderComponent = (
    overrideProps?: Partial<{
      state: XYState;
      setState: (newState: XYState) => void;
    }>
  ) => {
    const state = testState();
    return render(<XyAppearanceSettings setState={jest.fn()} state={state} {...overrideProps} />);
  };

  it.each<{
    seriesType: string;
    showsMissingValues?: boolean;
    showsFillOpacity?: boolean;
    showsPointVisibility?: boolean;
  }>([
    {
      seriesType: 'area_percentage_stacked',
      showsMissingValues: false,
      showsFillOpacity: true,
      showsPointVisibility: true,
    },
    {
      seriesType: 'bar_horizontal',
      showsMissingValues: false,
      showsFillOpacity: false,
      showsPointVisibility: false,
    },
    {
      seriesType: 'line',
      showsMissingValues: true,
      showsFillOpacity: false,
      showsPointVisibility: true,
    },
  ])(
    `should show settings for seriesTypes: $seriesType`,
    async ({
      seriesType,
      showsMissingValues = false,
      showsFillOpacity = false,
      showsPointVisibility = false,
    }) => {
      const state = testState();
      (state.layers[0] as XYDataLayerConfig).seriesType = seriesType as SeriesType;
      renderComponent({ state });

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
      if (showsPointVisibility) {
        expect(screen.getAllByTestId('lnsPointVisibilityOption')).toHaveLength(1);
      } else {
        expect(screen.queryAllByTestId('lnsPointVisibilityOption')).toHaveLength(0);
      }
    }
  );
});
