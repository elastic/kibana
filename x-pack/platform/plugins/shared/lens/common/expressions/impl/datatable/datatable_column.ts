/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction } from '@elastic/eui';
import type { PaletteOutput, CustomPaletteParams, ColorMapping } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { ExpressionFunctionDefinition, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { SortingHint } from '@kbn/lens-common';
import type { CollapseFunction } from '../../defs/collapse';

const LENS_DATATABLE_COLUMN = 'lens_datatable_column';

export type LensGridDirection = 'none' | Direction;

export interface DatatableColumnConfig {
  columns: DatatableColumnResult[];
  sortingColumnId: string | undefined;
  sortingDirection: LensGridDirection;
}

export type DatatableColumnArgs = Omit<ColumnState, 'palette' | 'colorMapping'> & {
  palette?: PaletteOutput<CustomPaletteState>;
  colorMapping?: string;
  summaryRowValue?: unknown;
  sortingHint?: SortingHint;
};

export interface ColumnState {
  columnId: string;
  width?: number;
  hidden?: boolean;
  oneClickFilter?: boolean;
  isTransposed?: boolean;
  // These flags are necessary to transpose columns and map them back later
  // They are set automatically and are not user-editable
  transposable?: boolean;
  originalColumnId?: string;
  originalName?: string;
  bucketValues?: Array<{ originalBucketColumn: DatatableColumn; value: unknown }>;
  alignment?: 'left' | 'right' | 'center';
  palette?: PaletteOutput<CustomPaletteParams>;
  colorMapping?: ColorMapping.Config;
  colorMode?: 'none' | 'cell' | 'text';
  summaryRow?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  summaryLabel?: string;
  collapseFn?: CollapseFunction;
  isMetric?: boolean;
  /** When true and colorMode is 'none', show a progress bar next to the value (metric columns). */
  showProgressBar?: boolean;
  /** When showProgressBar is true: 'single' = static color (progressBarColor), 'solid' = color mapping, 'gradient' = gradient from color mapping. */
  progressBarColorMode?: 'single' | 'solid' | 'gradient';
  /** When showProgressBar is true: 'highest' = max is column max, 'custom' = use progressBarMaxValue. */
  progressBarMaxMode?: 'highest' | 'custom';
  /** When progressBarMaxMode is 'custom', this is the max value for the progress bar. */
  progressBarMaxValue?: number;
  /** When showProgressBar is true and colorMode is 'none': custom progress bar color (hex). */
  progressBarColor?: string;
}

export type DatatableColumnResult = DatatableColumnArgs & {
  type: typeof LENS_DATATABLE_COLUMN;
};

export type DatatableColumnFn = ExpressionFunctionDefinition<
  typeof LENS_DATATABLE_COLUMN,
  null,
  DatatableColumnArgs,
  DatatableColumnResult
>;

export const datatableColumn: DatatableColumnFn = {
  name: LENS_DATATABLE_COLUMN,
  aliases: [],
  type: LENS_DATATABLE_COLUMN,
  help: '',
  inputTypes: ['null'],
  args: {
    columnId: { types: ['string'], help: '' },
    alignment: { types: ['string'], help: '' },
    sortingHint: { types: ['string'], help: '' },
    hidden: { types: ['boolean'], help: '' },
    oneClickFilter: { types: ['boolean'], help: '' },
    width: { types: ['number'], help: '' },
    isTransposed: { types: ['boolean'], help: '' },
    transposable: { types: ['boolean'], help: '' },
    colorMode: { types: ['string'], help: '' },
    palette: {
      types: ['palette'],
      help: '',
    },
    colorMapping: {
      types: ['string'],
      help: '',
    },
    summaryRow: { types: ['string'], help: '' },
    summaryLabel: { types: ['string'], help: '' },
    showProgressBar: { types: ['boolean'], help: '' },
    progressBarColorMode: { types: ['string'], help: '' },
    progressBarMaxMode: { types: ['string'], help: '' },
    progressBarMaxValue: { types: ['number'], help: '' },
    progressBarColor: { types: ['string'], help: '' },
  },
  fn: function fn(input, args) {
    return {
      type: LENS_DATATABLE_COLUMN,
      ...args,
    };
  },
};
