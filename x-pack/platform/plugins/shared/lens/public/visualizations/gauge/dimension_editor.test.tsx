/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { GaugeTicksPositions, GaugeColorModes } from '@kbn/expression-gauge-plugin/common';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';

import { GaugeDimensionEditor } from './dimension_editor';
import { createMockFramePublicAPI, createMockDatasource } from '../../mocks';
import type { GaugeVisualizationState } from './constants';
import { defaultPaletteParams } from './palette_config';

type Props = ComponentProps<typeof GaugeDimensionEditor>;

describe('GaugeDimensionEditor', () => {
  const mockSetState = jest.fn();
  const paletteService = chartPluginMock.createPaletteRegistry();
  const defaultFrame = createMockFramePublicAPI({
    activeData: {
      first: {
        type: 'datatable',
        columns: [
          { id: 'metric-col-id', name: 'metric', meta: { type: 'number' } },
          { id: 'min-col-id', name: 'min', meta: { type: 'number' } },
          { id: 'max-col-id', name: 'max', meta: { type: 'number' } },
        ],
        rows: [
          {
            'metric-col-id': 50,
            'min-col-id': 0,
            'max-col-id': 100,
          },
        ],
      },
    },
  });

  const defaultState: GaugeVisualizationState = {
    layerId: 'first',
    layerType: LayerTypes.DATA,
    metricAccessor: 'metric-col-id',
    ticksPosition: GaugeTicksPositions.AUTO,
    colorMode: GaugeColorModes.NONE,
    labelMajorMode: 'auto',
    shape: 'horizontalBullet',
  };

  const defaultProps: Props = {
    layerId: 'first',
    groupId: 'metric',
    accessor: 'metric-col-id',
    state: defaultState,
    datasource: createMockDatasource('formBased', {
      getOperationForColumnId: jest.fn(() => ({
        hasReducedTimeRange: false,
        dataType: 'number',
        hasTimeShift: false,
        label: 'mock-operation',
        isBucketed: false,
      })),
    }).publicAPIMock,
    frame: defaultFrame,
    setState: mockSetState,
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    panelRef: { current: null },
    isInlineEditing: false,
    paletteService,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderGaugeDimensionEditor(overrides: Partial<Props> = {}) {
    return render(<GaugeDimensionEditor {...defaultProps} {...overrides} />);
  }

  it('renders when the accessor matches the metric accessor', () => {
    renderGaugeDimensionEditor();

    expect(screen.getByTestId('lnsDynamicColoringGaugeSwitch')).toBeInTheDocument();
  });

  it('does not render when the accessor does not match the metric accessor', () => {
    const { container } = renderGaugeDimensionEditor({ accessor: 'different-accessor' });

    expect(container.firstChild).toBeNull();
  });

  it('toggles dynamic coloring when the band colors switch is clicked', async () => {
    const user = userEvent.setup();

    renderGaugeDimensionEditor();

    const switchElement = screen.getByTestId('lnsDynamicColoringGaugeSwitch');
    await user.click(switchElement);

    expect(mockSetState).toHaveBeenCalledWith(
      expect.objectContaining({
        colorMode: GaugeColorModes.PALETTE,
        ticksPosition: GaugeTicksPositions.BANDS,
        palette: expect.objectContaining({
          type: 'palette',
          name: defaultPaletteParams.name,
          params: expect.objectContaining({
            // initializes palette with open ended percent range
            rangeType: 'percent',
            rangeMin: -Infinity,
            rangeMax: Infinity,
          }),
        }),
      })
    );
  });
});
