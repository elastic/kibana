import React from 'react';
import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/common';
export declare const createRenderDatatableCellPopover: (sortedTable: Datatable, columnFilterable?: boolean[]) => ((popoverProps: EuiDataGridCellPopoverElementProps) => React.ReactNode);
