/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { PaletteRegistry } from '@kbn/coloring';
import type { IAggType } from '@kbn/data-plugin/public';
import type { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import type { ILensInterpreterRenderHandlers, LensCellValueAction } from '@kbn/lens-common';
import type { FormatFactory } from '../../../../common/types';
import type { DatatableProps } from '../../../../common/expressions';

export type DatatableRenderProps = DatatableProps & {
  formatFactory: FormatFactory;
  dispatchEvent: ILensInterpreterRenderHandlers['event'];
  getType: (meta?: DatatableColumnMeta) => IAggType | undefined;
  paletteService: PaletteRegistry;
  theme: CoreSetup['theme'];
  interactive: boolean;
  renderComplete: () => void;

  /**
   * A boolean for each table row, which is true if the row active
   * ROW_CLICK_TRIGGER actions attached to it, otherwise false.
   */
  rowHasRowClickTriggerActions?: boolean[];
  /**
   * Array of LensCellValueAction to be rendered on each column by id
   * uses CELL_VALUE_TRIGGER actions attached.
   */
  columnCellValueActions?: LensCellValueAction[][];
  columnFilterable?: boolean[];
};

export interface DataContextType {
  table?: Datatable;
  rowHasRowClickTriggerActions?: boolean[];
  alignments?: Map<string, 'left' | 'right' | 'center'>;
  minMaxByColumnId?: Map<string, { min: number; max: number }>;
  handleFilterClick?: (
    field: string,
    value: unknown,
    colIndex: number,
    rowIndex: number,
    negate?: boolean
  ) => void;
}
