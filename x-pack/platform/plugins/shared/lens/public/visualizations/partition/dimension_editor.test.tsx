/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { createMockDatasource, createMockFramePublicAPI } from '../../mocks';
import { PieVisualizationState } from '../../../common/types';
import { DimensionEditor, DimensionEditorProps } from './dimension_editor';
import { getKbnPalettes } from '@kbn/palettes';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';

const darkMode = false;
const paletteServiceMock = chartPluginMock.createPaletteRegistry();
const palettes = getKbnPalettes({ name: 'borealis', darkMode });

describe('DimensionEditor', () => {
  let defaultState: PieVisualizationState;
  let defaultProps: DimensionEditorProps;
  let buildProps: (props?: Partial<DimensionEditorProps>) => DimensionEditorProps;

  beforeEach(() => {
    defaultState = {
      shape: 'pie',
      layers: [
        {
          layerId: 'layer-id',
          primaryGroups: ['group-1', 'group-2'],
          metrics: ['metrics-id'],
          numberDisplay: 'percent',
          categoryDisplay: 'default',
          legendDisplay: 'default',
          nestedLegend: false,
          layerType: 'data',
          colorMapping: {
            assignments: [],
            specialAssignments: [
              { rules: [{ type: 'other' }], color: { type: 'loop' }, touched: false },
            ],
            paletteId: 'default',
            colorMode: { type: 'categorical' },
          },
        },
      ],
    };

    const mockFrame = createMockFramePublicAPI();
    const fieldFormatsMock = fieldFormatsServiceMock.createStartContract();
    mockFrame.datasourceLayers = Object.fromEntries(
      defaultState.layers.map(({ layerId: id }) => [id, createMockDatasource(id).publicAPIMock])
    );

    defaultProps = {
      state: defaultState,
      layerId: defaultState.layers[0].layerId,
      accessor: defaultState.layers[0].primaryGroups[0],
      frame: mockFrame,
      datasource: createMockDatasource().publicAPIMock,
      groupId: 'primaryGroups',
      setState: jest.fn(),
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      panelRef: { current: null },
      palettes,
      isDarkMode: darkMode,
      paletteService: paletteServiceMock,
      formatFactory: fieldFormatsMock.deserialize,
    };

    buildProps = (props = {}) => {
      const state = props.state ?? defaultState;
      const layerId = props.layerId ?? state.layers[0].layerId;
      const accessor =
        props.accessor ??
        state.layers.find((l) => l.layerId === layerId)?.primaryGroups[0] ??
        'accessor-id';
      const frame = props.frame ?? mockFrame;
      const datasource = props.datasource ?? frame.datasourceLayers[layerId];

      return {
        ...defaultProps,
        ...props,
        state,
        layerId,
        accessor,
        frame,
        datasource,
      };
    };
  });

  const renderDimensionEditor = (propOverrides: Partial<DimensionEditorProps> = {}) => {
    const props = buildProps(propOverrides);
    render(<DimensionEditor {...props} />);

    return props;
  };

  describe('Dimension Editor', () => {
    describe('Color mapping', () => {
      test.each([
        ['show', 'first', 1],
        ['hide', 'second', 2],
      ])('should %s color mapping row for the %s group', (a, b, groupNumber) => {
        const layer = defaultProps.state.layers.find((l) => l.layerId === defaultProps.layerId)!;
        const primaryGroups = layer.primaryGroups.slice();
        layer.primaryGroups.reverse(); // should not care about this order

        defaultProps.frame.datasourceLayers[layer.layerId]!.getTableSpec = () => {
          return primaryGroups.map((id) => ({ columnId: id, fields: [] }));
        };

        renderDimensionEditor({ accessor: `group-${groupNumber}` });

        const colorMappingBtn = screen.queryByRole('button', { name: 'Edit colors' });

        if (groupNumber === 1) {
          expect(colorMappingBtn).toBeInTheDocument();
        } else {
          expect(colorMappingBtn).not.toBeInTheDocument();
        }
      });
    });
  });
});
