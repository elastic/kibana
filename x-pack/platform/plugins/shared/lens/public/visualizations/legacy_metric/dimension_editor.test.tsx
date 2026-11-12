/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import type {
  FramePublicAPI,
  VisualizationDimensionEditorProps,
  LegacyMetricState,
} from '@kbn/lens-common';
import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import { MetricDimensionEditor } from './dimension_editor';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { ColorMode } from '@kbn/charts-plugin/public';
import type { PaletteOutput, PaletteRegistry, CustomPaletteParams } from '@kbn/coloring';
import { CustomizablePalette } from '@kbn/coloring';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { DatasourcePublicAPI } from '../..';
import { renderWithProviders } from '../../test_utils/test_utils';

jest.mock('@kbn/coloring', () => {
  const actual = jest.requireActual<typeof import('@kbn/coloring')>('@kbn/coloring');
  return {
    ...actual,
    CustomizablePalette: jest.fn(
      (props: React.ComponentProps<typeof actual.CustomizablePalette>) => (
        <actual.CustomizablePalette {...props} />
      )
    ),
  };
});

function paletteParamsContaining(paramsToCheck: PaletteOutput<CustomPaletteParams>['params']) {
  return expect.objectContaining({
    palette: expect.objectContaining({
      params: expect.objectContaining(paramsToCheck),
    }),
  });
}

describe('metric dimension editor', () => {
  let frame: FramePublicAPI;
  let state: LegacyMetricState;
  let setState: (newState: LegacyMetricState) => void;
  let props: VisualizationDimensionEditorProps<LegacyMetricState> & {
    paletteService: PaletteRegistry;
  };

  function testState(): LegacyMetricState {
    return {
      layerId: 'first',
      layerType: LayerTypes.DATA,
      accessor: 'foo',
    };
  }

  beforeEach(() => {
    state = testState();
    frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: createMockDatasource('test').publicAPIMock,
    };
    frame.activeData = {
      first: {
        type: 'datatable',
        columns: [
          {
            id: 'foo',
            name: 'foo',
            meta: {
              type: 'string',
            },
          },
        ],
        rows: [{ foo: 5 }],
      },
    };
    setState = jest.fn();
    props = {
      accessor: 'foo',
      frame,
      groupId: 'columns',
      layerId: 'first',
      state,
      setState,
      paletteService: chartPluginMock.createPaletteRegistry(),
      panelRef: React.createRef(),
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      datasource: {} as DatasourcePublicAPI,
    };
    // add a div to the ref
    props.panelRef.current = document.createElement('div');
    document.body.appendChild(props.panelRef.current);
    jest.mocked(CustomizablePalette).mockClear();
  });

  afterEach(() => {
    props.panelRef.current?.remove();
  });

  it('should not show the dynamic coloring option for non numeric columns', () => {
    renderWithProviders(<MetricDimensionEditor {...props} />);
    expect(screen.queryByTestId('lnsLegacyMetric_dynamicColoring_groups')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
  });

  it('should set the dynamic coloring default to "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    renderWithProviders(<MetricDimensionEditor {...props} />);
    const control = within(screen.getByTestId('lnsLegacyMetric_dynamicColoring_groups'));
    expect(control.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');

    expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
  });

  it('should show the dynamic palette display ony when colorMode is different from "none"', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.colorMode = ColorMode.Labels;
    renderWithProviders(<MetricDimensionEditor {...props} />);
    const control = within(screen.getByTestId('lnsLegacyMetric_dynamicColoring_groups'));
    expect(control.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getByTestId('lns_dynamicColoring_edit')).toBeInTheDocument();
  });

  it('should prefill the palette stops with some colors when enabling coloring', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    renderWithProviders(<MetricDimensionEditor {...props} />);

    const control = within(screen.getByTestId('lnsLegacyMetric_dynamicColoring_groups'));
    fireEvent.click(control.getByRole('button', { name: 'Text' }));

    expect(props.setState).toHaveBeenCalledWith(
      paletteParamsContaining({
        stops: expect.any(Array), // shallow check it's ok
      })
    );
  });

  it('should open the palette panel when "Settings" link is clicked in the palette input', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    state.colorMode = ColorMode.Background;
    renderWithProviders(<MetricDimensionEditor {...props} />);

    fireEvent.click(screen.getByTestId('lns_colorEditing_trigger'));

    expect(screen.getByTestId('lns-palettePanelFlyout')).toBeInTheDocument();
  });

  it('should provide have a special data min/max for zero metric value', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    frame.activeData!.first.rows[0].foo = 0;
    state.colorMode = ColorMode.Background;
    renderWithProviders(<MetricDimensionEditor {...props} />);

    fireEvent.click(screen.getByTestId('lns_colorEditing_trigger'));

    expect(jest.mocked(CustomizablePalette).mock.lastCall?.[0].dataBounds).toEqual({
      min: -50,
      max: 100,
    });
  });

  it('should work for negative metric value', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    frame.activeData!.first.rows[0].foo = -1;
    state.colorMode = ColorMode.Background;
    renderWithProviders(<MetricDimensionEditor {...props} />);

    fireEvent.click(screen.getByTestId('lns_colorEditing_trigger'));

    expect(jest.mocked(CustomizablePalette).mock.lastCall?.[0].dataBounds).toEqual({
      min: -2,
      max: 0,
    });
  });

  it('should apply the default named palette with open bounds', () => {
    frame.activeData!.first.columns[0].meta.type = 'number';
    frame.activeData!.first.rows[0].foo = 5;
    state.colorMode = ColorMode.None;
    state.palette = undefined;
    renderWithProviders(<MetricDimensionEditor {...props} />);

    const control = within(screen.getByTestId('lnsLegacyMetric_dynamicColoring_groups'));
    fireEvent.click(control.getByRole('button', { name: 'Fill' }));

    expect(setState).toHaveBeenCalledWith(
      paletteParamsContaining({
        name: 'status',
        continuity: 'all',
        rangeMin: -Infinity,
        rangeMax: Infinity,
        stops: expect.arrayContaining([]),
      })
    );
  });
});
