/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
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
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import type { TableDimensionEditorProps } from './dimension_editor';
import { TableDimensionEditor } from './dimension_editor';
import {
  getAdjustedRangeForInputChange,
  getDecimalPlacesFromInputText,
} from './progress_bar_controls';
import { renderWithProviders } from '../../../test_utils/test_utils';

type MockPalette = PaletteOutput<CustomPaletteParams>;

interface MockColorMappingByValuesProps {
  palette: MockPalette;
  setPalette: (palette: MockPalette) => void;
  dataBounds: { min: number; max: number };
}

jest.mock('../../../shared_components/coloring/color_mapping_by_values', () => {
  const ReactLib = jest.requireActual<typeof import('react')>('react');

  return {
    ColorMappingByValues: ({ palette, setPalette, dataBounds }: MockColorMappingByValuesProps) => {
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
          <div data-test-subj="mock-current-bounds">
            {dataBounds.min}:{dataBounds.max}
          </div>
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
  let setState: jest.Mock<void, [DatatableVisualizationState]>;

  const setFooRows = (rows: Array<{ foo: number }>) => {
    const activeData = frame.activeData;
    if (!activeData) {
      throw new Error('Expected Lens frame activeData to be available in progress-bar test');
    }

    activeData.first.rows = rows;
  };

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

  it('uses the active progress range as the palette editor domain', () => {
    setFooRows([{ foo: 70 }, { foo: 80 }, { foo: 90 }]);
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'gradient', valueRange: { mode: 'custom', min: 0, max: 100 } },
      palette: { type: 'palette', name: 'status' },
    };

    renderEditor();

    expect(screen.getByTestId('mock-current-bounds')).toHaveTextContent('0:100');
  });

  it('adjusts the opposite bound when the edited max would cross the min', () => {
    expect(getAdjustedRangeForInputChange(1, ['20000', '100'])).toEqual([100, 100]);
  });

  it('preserves the edited min value and adjusts max to keep min <= max on blur', async () => {
    setFooRows([{ foo: 70 }, { foo: 80 }, { foo: 90 }]);
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'gradient', valueRange: { mode: 'custom', min: 0, max: 100 } },
      palette: { type: 'palette', name: 'status' },
    };

    renderEditor();

    const [minInput, maxInput] = screen.getAllByRole('spinbutton');

    fireEvent.focus(minInput);
    fireEvent.change(minInput, { target: { value: '200' } });
    await act(async () => jest.advanceTimersByTime(300));

    expect(minInput).toHaveValue(200);
    expect(maxInput).toHaveValue(100);
    expect(setState).not.toHaveBeenCalled();

    fireEvent.blur(minInput);

    expect(maxInput).toHaveValue(200);
    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({
            columnId: 'foo',
            fillStyle: expect.objectContaining({
              valueRange: { mode: 'custom', min: 200, max: 200 },
            }),
          }),
        ]),
      })
    );
  });

  it('does not rewrite the opposite bound while a partial replacement is still invalid', async () => {
    setFooRows([{ foo: 70 }, { foo: 80 }, { foo: 90 }]);
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: {
        fillMode: 'gradient',
        valueRange: { mode: 'custom', min: 20000, max: 80000 },
      },
      palette: { type: 'palette', name: 'status' },
    };

    renderEditor();

    const [minInput, maxInput] = screen.getAllByRole('spinbutton');

    fireEvent.focus(maxInput);
    fireEvent.change(maxInput, { target: { value: '900' } });
    await act(async () => jest.advanceTimersByTime(300));

    expect(minInput).toHaveValue(20000);
    expect(maxInput).toHaveValue(900);
    expect(setState).not.toHaveBeenCalled();

    fireEvent.change(maxInput, { target: { value: '90000' } });
    await act(async () => jest.advanceTimersByTime(300));

    expect(minInput).toHaveValue(20000);
    expect(maxInput).toHaveValue(90000);
    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({
            columnId: 'foo',
            fillStyle: expect.objectContaining({
              valueRange: { mode: 'custom', min: 20000, max: 90000 },
            }),
          }),
        ]),
      })
    );
  });

  it('passively shrinks the slider max on blur when the committed upper knob ends up left of center', async () => {
    setFooRows([{ foo: 70 }, { foo: 80 }, { foo: 90 }]);
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: {
        fillMode: 'gradient',
        valueRange: { mode: 'custom', min: 9000, max: 900000 },
      },
      palette: { type: 'palette', name: 'status' },
    };

    renderEditor();

    const [, maxInput] = screen.getAllByRole('spinbutton');
    const slider = screen.getByTestId('lnsDatatable_progressBar_valueRangeSlider');

    fireEvent.focus(maxInput);
    fireEvent.change(maxInput, { target: { value: '90000' } });
    await act(async () => jest.advanceTimersByTime(300));

    expect(slider).toHaveAttribute('max', '891000');

    fireEvent.blur(maxInput);

    expect(slider).toHaveAttribute('max', '81000');
  });

  it('expands slider bounds only when manual inputs move beyond them and does not flag valid values as invalid', async () => {
    setFooRows([{ foo: 70 }, { foo: 80 }, { foo: 90 }]);
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'gradient', valueRange: { mode: 'custom', min: -100, max: 100 } },
      palette: { type: 'palette', name: 'status' },
    };

    renderEditor();

    const [minInput, maxInput] = screen.getAllByRole('spinbutton');
    const slider = screen.getByTestId('lnsDatatable_progressBar_valueRangeSlider');

    fireEvent.focus(maxInput);
    fireEvent.change(maxInput, { target: { value: '2000' } });
    await act(async () => jest.advanceTimersByTime(300));

    expect(minInput).toHaveValue(-100);
    expect(maxInput).toHaveValue(2000);
    expect(minInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(maxInput).not.toHaveAttribute('aria-invalid', 'true');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '2100');
  });

  it('preserves raw-input precision when counting decimal places', () => {
    expect(getDecimalPlacesFromInputText('1.2300')).toBe(4);
    expect(getDecimalPlacesFromInputText('1e-4')).toBe(4);
  });

  it('seeds Custom from the current Auto domain after reopening with stale auto-mode bounds', async () => {
    setFooRows([{ foo: 70 }, { foo: 80 }, { foo: 90 }]);
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'gradient', valueRange: { mode: 'auto', min: 0, max: 100 } },
      palette: { type: 'palette', name: 'status', params: { rangeMin: 0, rangeMax: 100 } },
    };

    renderEditor();

    await user.click(screen.getByTestId('lnsDatatable_progressBar_valueRange_custom'));
    await act(async () => jest.advanceTimersByTime(256));

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({
            columnId: 'foo',
            fillStyle: expect.objectContaining({
              valueRange: { mode: 'custom', min: 70, max: 90 },
            }),
          }),
        ]),
      })
    );
  });

  it('seeds Custom from a flat positive Auto domain by anchoring back to zero', async () => {
    setFooRows([{ foo: 85 }, { foo: 85 }, { foo: 85 }]);
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'gradient', valueRange: { mode: 'auto' } },
      palette: { type: 'palette', name: 'status' },
    };

    renderEditor();

    await user.click(screen.getByTestId('lnsDatatable_progressBar_valueRange_custom'));
    await act(async () => jest.advanceTimersByTime(256));

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({
            columnId: 'foo',
            fillStyle: expect.objectContaining({
              valueRange: { mode: 'custom', min: 0, max: 85 },
            }),
          }),
        ]),
      })
    );
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

  it('shows the default progress palette for a solid progress metric with no persisted palette', () => {
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'solid', valueRange: { mode: 'auto' } },
    };

    renderEditor();

    expect(screen.getByTestId('mock-current-palette')).toHaveTextContent('status');
  });

  it('switches a single progress metric without a persisted palette to the default progress palette', async () => {
    state.columns[0] = {
      columnId: 'foo',
      colorMode: 'progress',
      fillStyle: { fillMode: 'single', valueRange: { mode: 'auto' }, color: '#1ba9f5' },
    };

    renderEditor();

    await user.click(screen.getByTestId('lnsDatatable_progressBar_barColor_solid'));

    expect(screen.getByTestId('mock-current-palette')).toHaveTextContent('status');
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
