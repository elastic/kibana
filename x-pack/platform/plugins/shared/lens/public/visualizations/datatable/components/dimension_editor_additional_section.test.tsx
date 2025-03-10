/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import { render, screen } from '@testing-library/react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import {
  DatasourcePublicAPI,
  FramePublicAPI,
  VisualizationDimensionEditorProps,
} from '../../../types';
import { DatatableVisualizationState } from '../visualization';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import { TableDimensionEditorAdditionalSection } from './dimension_editor_addtional_section';
import { ColumnState } from '../../../../common/expressions';

describe('data table dimension editor additional section', () => {
  let frame: FramePublicAPI;
  let state: DatatableVisualizationState;
  let props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
  };

  function testState(): DatatableVisualizationState {
    return {
      layerId: 'first',
      layerType: LayerTypes.DATA,
      columns: [
        {
          columnId: 'foo',
          summaryRow: undefined,
        },
      ],
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
              type: 'number',
            },
          },
        ],
        rows: [],
      },
    };
    props = {
      accessor: 'foo',
      frame,
      groupId: 'columns',
      layerId: 'first',
      state,
      setState: jest.fn(),
      paletteService: chartPluginMock.createPaletteRegistry(),
      panelRef: React.createRef(),
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      datasource: {} as DatasourcePublicAPI,
    };
  });

  const renderComponent = (
    overrideProps?: Partial<
      VisualizationDimensionEditorProps<DatatableVisualizationState> & {
        paletteService: PaletteRegistry;
      }
    >
  ) => {
    return render(<TableDimensionEditorAdditionalSection {...props} {...overrideProps} />);
  };

  it('should set the summary row fn default to "none"', () => {
    state.columns[0].summaryRow = undefined;
    renderComponent();
    expect(screen.getByRole('combobox')).toHaveValue('None');
    expect(screen.queryByTestId('lnsDatatable_summaryrow_label')).not.toBeInTheDocument();
  });

  it.each<[summaryRow: ColumnState['summaryRow'], label: string]>([
    ['sum', 'Sum'],
    ['avg', 'Average'],
    ['count', 'Value count'],
    ['min', 'Minimum'],
    ['max', 'Maximum'],
  ])(
    'should show the summary row label input ony when summary row fn is "%s"',
    (summaryRow, label) => {
      state.columns[0].summaryRow = summaryRow;
      renderComponent();
      expect(screen.getByRole('combobox')).toHaveValue(label);
      expect(screen.getByTestId('lnsDatatable_summaryrow_label')).toHaveValue(label);
    }
  );

  it("should show the correct summary row name when user's changes summary label", () => {
    state.columns[0].summaryRow = 'sum';
    state.columns[0].summaryLabel = 'MySum';
    renderComponent();
    expect(screen.getByRole('combobox')).toHaveValue('Sum');
    expect(screen.getByTestId('lnsDatatable_summaryrow_label')).toHaveValue('MySum');
  });

  it('should not show the summary field for non numeric columns', () => {
    frame.activeData!.first.columns[0].meta.type = 'string';
    expect(screen.queryByTestId('lnsDatatable_summaryrow_function')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lnsDatatable_summaryrow_label')).not.toBeInTheDocument();
  });
});
