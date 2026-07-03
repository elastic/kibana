/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type {
  DatatableVisualizationState,
  FramePublicAPI,
  OperationDescriptor,
} from '@kbn/lens-common';
import { getKbnPalettes } from '@kbn/palettes';
import { EuiComboBoxTestHarness } from '@kbn/test-eui-helpers';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import type { TableDimensionEditorProps } from './dimension_editor';
import { TableDimensionEditor } from './dimension_editor';
import { getCellDecorationLabel } from '../cell_decoration';
import { renderWithProviders } from '../../../test_utils/test_utils';

type MockPalette = PaletteOutput<CustomPaletteParams>;

interface MockColorMappingByValuesProps {
  palette: MockPalette;
  setPalette: (palette: MockPalette) => void;
}

jest.mock('../../../shared_components/coloring/color_mapping_by_values', () => {
  const ReactLib = jest.requireActual<typeof import('react')>('react');

  return {
    ColorMappingByValues: ({ palette, setPalette }: MockColorMappingByValuesProps) => {
      const [isOpen, setIsOpen] = ReactLib.useState(false);

      return (
        <div>
          <button
            aria-label="Edit colors"
            data-test-subj="lns_dynamicColoring_edit"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            Edit colors
          </button>
          <button
            data-test-subj="mock-set-status-palette"
            onClick={() => setPalette({ type: 'palette', name: 'status' })}
            type="button"
          >
            Set status palette
          </button>
          <div data-test-subj="mock-current-palette">{palette.name}</div>
          {isOpen ? <div data-test-subj="lns-palettePanel-values" /> : null}
        </div>
      );
    },
  };
});

const fieldFormatsMock = fieldFormatsServiceMock.createStartContract();

describe('data table progress bar regressions', () => {
  let user: UserEvent;
  let frame: FramePublicAPI;
  let state: DatatableVisualizationState;
  let props: TableDimensionEditorProps;
  let colorMode: EuiComboBoxTestHarness;
  let setState: jest.Mock<void, [DatatableVisualizationState]>;

  const getDynamicColoringLabel = (
    colorModeValue: DatatableVisualizationState['columns'][number]['colorMode']
  ) => getCellDecorationLabel(colorModeValue ?? 'none');

  function mockFirstColumn(overrides: Partial<OperationDescriptor> = {}) {
    const firstDatasource = frame.datasourceLayers?.first;
    if (!firstDatasource) {
      throw new Error('Expected the first datasource layer to exist');
    }

    firstDatasource.getOperationForColumnId = jest.fn().mockReturnValue({
      label: 'label',
      isBucketed: false,
      dataType: 'number',
      isStaticValue: false,
      isTimeScale: false,
      scale: 'ratio',
      ...overrides,
    });
  }

  function mockActiveDataColumnType(type: DatatableColumnType) {
    const activeData = frame.activeData?.first;
    if (!activeData) {
      throw new Error('Expected active data for the first layer');
    }

    activeData.columns[0].meta.type = type;
  }

  function renderEditor() {
    return renderWithProviders(<TableDimensionEditor {...props} />);
  }

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    colorMode = new EuiComboBoxTestHarness('lnsDatatable_dynamicColoring_groups');
    state = {
      layerId: 'first',
      layerType: LayerTypes.DATA,
      columns: [{ columnId: 'foo' }],
    };
    frame = createMockFramePublicAPI();
    const datasource = createMockDatasource('test');
    frame.datasourceLayers = {
      first: datasource.publicAPIMock,
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
              params: {},
            },
          },
        ],
        rows: [],
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
      isDarkMode: false,
      paletteService: chartPluginMock.createPaletteRegistry(),
      palettes: getKbnPalettes({ name: 'amsterdam', darkMode: false }),
      panelRef: React.createRef(),
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      datasource: datasource.publicAPIMock,
      formatFactory: fieldFormatsMock.deserialize,
    };

    mockFirstColumn();
    mockActiveDataColumnType('number');
  });

  it('seeds gradient fill and the status palette when enabling progress mode', async () => {
    renderEditor();

    await colorMode.select(getDynamicColoringLabel('progress'));
    await act(async () => jest.advanceTimersByTime(256));

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: [
          expect.objectContaining({
            columnId: 'foo',
            colorMode: 'progress',
            fillStyle: expect.objectContaining({ fillMode: 'gradient' }),
            palette: expect.objectContaining({ type: 'palette', name: 'status' }),
          }),
        ],
      })
    );
  });

  it('shows the Auto value-range tooltip in progress mode', async () => {
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'gradient', valueRange: { mode: 'auto' } },
      palette: { type: 'palette', name: 'status' },
    };

    renderEditor();

    await user.hover(screen.getByTestId('lnsDatatable_progressBar_valueRange_auto'));

    expect(
      await screen.findByText(
        'Auto uses the loaded data range for this column. Switch to Custom to set your own min and max.'
      )
    ).toBeInTheDocument();
  });

  it('preserves local progress-bar palette changes when hide column is toggled', async () => {
    state.columns = [
      {
        columnId: 'foo',
        colorMode: 'progress',
        fillStyle: { fillMode: 'gradient' },
        palette: { type: 'palette', name: 'positive' },
      },
      {
        columnId: 'bar',
      },
    ];

    renderEditor();

    expect(screen.getByTestId('mock-current-palette')).toHaveTextContent('positive');

    await user.click(screen.getByTestId('mock-set-status-palette'));
    expect(screen.getByTestId('mock-current-palette')).toHaveTextContent('status');

    const hideSwitch = screen.getByTestId('lns-table-column-hidden');
    await user.click(hideSwitch);
    await user.click(hideSwitch);
    expect(screen.getByTestId('mock-current-palette')).toHaveTextContent('status');

    await act(async () => jest.advanceTimersByTime(256));

    const finalState = setState.mock.calls[setState.mock.calls.length - 1]?.[0];

    expect(finalState?.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          columnId: 'foo',
          colorMode: 'progress',
          hidden: false,
          fillStyle: expect.objectContaining({ fillMode: 'gradient' }),
          palette: expect.objectContaining({ type: 'palette', name: 'status' }),
        }),
      ])
    );
  });

  it('flushes progress-bar palette changes to Lens state immediately', async () => {
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'gradient' },
      palette: { type: 'palette', name: 'positive' },
    };

    renderEditor();

    await user.click(screen.getByTestId('mock-set-status-palette'));

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({
            columnId: 'foo',
            palette: expect.objectContaining({ type: 'palette', name: 'status' }),
          }),
        ]),
      })
    );
  });
});
