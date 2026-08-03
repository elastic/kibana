import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { DataGridDensity } from '@kbn/lens-common';
import type { FormatFactory } from '../../../../common/types';
import type { DatatableColumnConfig } from '../../../../common/expressions';
import type { DataContextType } from './types';
import type { CellColorFn } from '../../../shared_components/coloring/get_cell_color_fn';
export declare const createGridCell: (formatters: {
    [columnId: string]: ReturnType<FormatFactory>;
}, columnConfig: DatatableColumnConfig, DataContext: React.Context<DataContextType>, isDarkMode: boolean, getCellColor: (originalId: string, palette?: PaletteOutput<CustomPaletteState>, colorMapping?: string) => CellColorFn, paletteService: PaletteRegistry, fitRowToContent?: boolean, density?: DataGridDensity) => ({ rowIndex, columnId, setCellProps, isExpanded }: EuiDataGridCellValueElementProps) => React.JSX.Element;
