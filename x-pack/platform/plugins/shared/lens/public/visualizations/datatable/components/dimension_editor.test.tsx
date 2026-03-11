/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DEFAULT_COLOR_MAPPING_CONFIG } from '@kbn/coloring';
import { act, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { EuiButtonGroupTestHarness } from '@kbn/test-eui-helpers';
import type {
  FramePublicAPI,
  DatasourcePublicAPI,
  OperationDescriptor,
  DataType,
  DatatableVisualizationState,
} from '@kbn/lens-common';
import { createMockDatasource, createMockFramePublicAPI } from '../../../mocks';
import type { TableDimensionEditorProps } from './dimension_editor';
import { TableDimensionEditor } from './dimension_editor';
import type { ColumnState } from '../../../../common/expressions';
import { capitalize } from 'lodash';
import { getKbnPalettes } from '@kbn/palettes';
import { renderWithProviders } from '../../../test_utils/test_utils';

const fieldFormatsMock = fieldFormatsServiceMock.createStartContract();

describe('data table dimension editor', () => {
  let user: UserEvent;
  let frame: FramePublicAPI;
  let state: DatatableVisualizationState;
  let btnGroups: {
    colorMode: EuiButtonGroupTestHarness;
    alignment: EuiButtonGroupTestHarness;
  };
  let mockOperationForFirstColumn: (overrides?: Partial<OperationDescriptor>) => void;

  let props: TableDimensionEditorProps;

  function testState(): DatatableVisualizationState {
    return {
      layerId: 'first',
      layerType: LayerTypes.DATA,
      columns: [
        {
          columnId: 'foo',
        },
      ],
    };
  }

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    btnGroups = {
      colorMode: new EuiButtonGroupTestHarness('lnsDatatable_dynamicColoring_groups'),
      alignment: new EuiButtonGroupTestHarness('lnsDatatable_alignment_groups'),
    };
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
              params: {},
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
      isDarkMode: false,
      paletteService: chartPluginMock.createPaletteRegistry(),
      palettes: getKbnPalettes({ name: 'amsterdam', darkMode: false }),
      panelRef: React.createRef(),
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      datasource: {} as DatasourcePublicAPI,
      formatFactory: fieldFormatsMock.deserialize,
    };

    mockOperationForFirstColumn = (overrides: Partial<OperationDescriptor> = {}) => {
      frame!.datasourceLayers!.first!.getOperationForColumnId = jest.fn().mockReturnValue({
        label: 'label',
        isBucketed: false,
        dataType: 'string',
        hasTimeShift: false,
        hasReducedTimeRange: false,
        ...overrides,
      } satisfies OperationDescriptor);
    };
    mockOperationForFirstColumn();
  });

  const renderTableDimensionEditor = (overrideProps?: Partial<TableDimensionEditorProps>) => {
    return renderWithProviders(<TableDimensionEditor {...props} {...overrideProps} />, {
      wrapper: ({ children }) => (
        <>
          <div ref={props.panelRef} />
          {children}
        </>
      ),
    });
  };

  it('should render default alignment', () => {
    renderTableDimensionEditor();
    expect(btnGroups.alignment.getSelected()).toHaveTextContent('Left');
  });

  it('should render default alignment for number', () => {
    mockOperationForFirstColumn({ dataType: 'number' });
    renderTableDimensionEditor();
    expect(btnGroups.alignment.getSelected()).toHaveTextContent('Right');
  });

  it('should render default alignment for ranges', () => {
    mockOperationForFirstColumn({ isBucketed: true, dataType: 'number' });
    renderTableDimensionEditor();
    expect(btnGroups.alignment.getSelected()).toHaveTextContent('Left');
  });

  it('should render specific alignment', () => {
    state.columns[0].alignment = 'center';
    renderTableDimensionEditor();
    expect(btnGroups.alignment.getSelected()).toHaveTextContent('Center');
  });

  it('should set state for the right column', async () => {
    state.columns = [
      {
        columnId: 'foo',
      },
      {
        columnId: 'bar',
      },
    ];
    renderTableDimensionEditor();
    await user.click(screen.getByRole('button', { name: 'Center' }));
    jest.advanceTimersByTime(256);
    expect(props.setState).toHaveBeenCalledWith({
      ...state,
      columns: [
        {
          columnId: 'foo',
          alignment: 'center',
        },
        {
          columnId: 'bar',
        },
      ],
    });
  });

  it('should set the dynamic coloring default to "none"', () => {
    state.columns[0].colorMode = undefined;
    renderTableDimensionEditor();
    expect(btnGroups.colorMode.getSelected()).toHaveTextContent('None');
    expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
  });

  it.each<DataType>(['date'])(
    'should not show the dynamic coloring option for "%s" columns',
    (type) => {
      mockOperationForFirstColumn({ dataType: type });

      renderTableDimensionEditor();
      expect(screen.queryByTestId('lnsDatatable_dynamicColoring_groups')).not.toBeInTheDocument();
      expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
    }
  );

  it.each<ColumnState['colorMode']>(['cell', 'text'])(
    'should show the palette options ony when colorMode is "%s"',
    (colorMode) => {
      state.columns[0].colorMode = colorMode;
      renderTableDimensionEditor();
      expect(btnGroups.colorMode.getSelected()).toHaveTextContent(capitalize(colorMode));
      expect(screen.getByTestId('lns_dynamicColoring_edit')).toBeInTheDocument();
    }
  );

  it.each<ColumnState['colorMode']>(['none', undefined])(
    'should not show the palette options when colorMode is "%s"',
    (colorMode) => {
      state.columns[0].colorMode = colorMode;
      renderTableDimensionEditor();
      expect(btnGroups.colorMode.getSelected()).toHaveTextContent(capitalize(colorMode ?? 'none'));
      expect(screen.queryByTestId('lns_dynamicColoring_edit')).not.toBeInTheDocument();
    }
  );

  it('should set the coloring mode to the right column', async () => {
    state.columns = [{ columnId: 'foo' }, { columnId: 'bar' }];
    renderTableDimensionEditor();
    await user.click(screen.getByRole('button', { name: 'Cell' }));
    jest.advanceTimersByTime(256);
    expect(props.setState).toHaveBeenCalledWith({
      ...state,
      columns: [
        {
          columnId: 'foo',
          colorMode: 'cell',
          colorMapping: DEFAULT_COLOR_MAPPING_CONFIG,
          palette: expect.objectContaining({ type: 'palette' }),
        },
        {
          columnId: 'bar',
        },
      ],
    });
  });

  it('should not set colorMapping or palette if color mode is changed to "text"', async () => {
    const paletteId = 'non-default';
    state.columns = [
      {
        columnId: 'foo',
        colorMode: 'cell',
        colorMapping: {
          ...DEFAULT_COLOR_MAPPING_CONFIG,
          paletteId,
        },
        palette: {
          type: 'palette',
          name: paletteId,
        },
      },
    ];
    renderTableDimensionEditor();
    await user.click(screen.getByRole('button', { name: 'Text' }));
    jest.advanceTimersByTime(256);

    expect(props.setState).toHaveBeenCalledWith({
      ...state,
      columns: [
        {
          columnId: 'foo',
          colorMode: 'text',
          colorMapping: expect.objectContaining({ paletteId }),
          palette: expect.objectContaining({ type: 'palette', name: paletteId }),
        },
      ],
    });
  });

  it.each<{ flyout: 'terms' | 'values'; isBucketed: boolean; type: DataType }>([
    { flyout: 'terms', isBucketed: true, type: 'number' },
    { flyout: 'terms', isBucketed: false, type: 'string' },
    { flyout: 'values', isBucketed: false, type: 'number' },
  ])(
    'should show color by $flyout flyout when bucketing is $isBucketed with $type column',
    async ({ flyout, isBucketed, type }) => {
      state.columns[0].colorMode = 'cell';
      mockOperationForFirstColumn({ isBucketed, dataType: type });
      renderTableDimensionEditor();

      await user.click(screen.getByLabelText('Edit colors'));
      act(() => jest.advanceTimersByTime(256));

      expect(screen.getByTestId(`lns-palettePanel-${flyout}`)).toBeInTheDocument();
    }
  );

  it('should show the dynamic coloring option for a bucketed operation', () => {
    state.columns[0].colorMode = 'cell';
    mockOperationForFirstColumn({ isBucketed: true, dataType: 'string' });

    renderTableDimensionEditor();
    expect(screen.queryByTestId('lnsDatatable_dynamicColoring_groups')).toBeInTheDocument();
    expect(screen.queryByTestId('lns_dynamicColoring_edit')).toBeInTheDocument();
  });

  it('should clear palette and colorMapping when colorMode is set to "none"', () => {
    state.columns[0].colorMode = 'cell';
    state.columns[0].palette = {
      type: 'palette',
      name: 'default',
    };
    state.columns[0].colorMapping = DEFAULT_COLOR_MAPPING_CONFIG;

    renderTableDimensionEditor();

    act(() => {
      // this throws an error about state update even in act()
      btnGroups.colorMode.select('None');
    });

    jest.advanceTimersByTime(256);
    expect(props.setState).toBeCalledWith({
      ...state,
      columns: [
        expect.objectContaining({
          colorMode: 'none',
          palette: undefined,
          colorMapping: undefined,
        }),
      ],
    });
  });

  [true, false].forEach((isTransposed) => {
    it(`should${isTransposed ? ' not' : ''} show hidden switch when column is${
      !isTransposed ? ' not' : ''
    } transposed`, () => {
      state.columns[0].isTransposed = isTransposed;
      renderTableDimensionEditor();

      const hiddenSwitch = screen.queryByTestId('lns-table-column-hidden');
      if (isTransposed) {
        expect(hiddenSwitch).not.toBeInTheDocument();
      } else {
        expect(hiddenSwitch).toBeInTheDocument();
      }
    });
  });
});
