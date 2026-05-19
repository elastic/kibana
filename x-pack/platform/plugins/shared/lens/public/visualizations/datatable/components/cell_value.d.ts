import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { PaletteOutput } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { FormatFactory } from '../../../../common/types';
import type { DatatableColumnConfig } from '../../../../common/expressions';
import type { DataContextType } from './types';
import type { CellColorFn } from '../../../shared_components/coloring/get_cell_color_fn';
export declare const createGridCell: (formatters: Record<string, ReturnType<FormatFactory>>, columnConfig: DatatableColumnConfig, DataContext: React.Context<DataContextType>, isDarkMode: boolean, getCellColor: (originalId: string, palette?: PaletteOutput<CustomPaletteState>, colorMapping?: string) => CellColorFn, fitRowToContent?: boolean) => ({ rowIndex, columnId, setCellProps, isExpanded }: EuiDataGridCellValueElementProps) => React.JSX.Element;
