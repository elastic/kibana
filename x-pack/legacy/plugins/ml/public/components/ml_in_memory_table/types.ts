/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiInMemoryTable,
  Direction,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';

export type FieldDataColumnType<T> = EuiTableFieldDataColumnType<T>;

export type ComputedColumnType<T> = EuiTableComputedColumnType<T>;

export interface ExpanderColumnType<T> extends ComputedColumnType<T> {
  isExpander: true;
}

export type ActionsColumnType<T> = EuiTableActionsColumnType<T>;

export type ColumnType<T> =
  | ActionsColumnType<T>
  | ComputedColumnType<T>
  | ExpanderColumnType<T>
  | FieldDataColumnType<T>;

export enum SORT_DIRECTION {
  ASC = 'asc',
  DESC = 'desc',
}
export type SortDirection = SORT_DIRECTION.ASC | SORT_DIRECTION.DESC;
interface SortFields {
  field: string;
  direction: SortDirection | Direction;
}
export interface Sorting {
  sort?: SortFields;
}
export type SortingPropType =
  | boolean
  | {
      sort: SortFields;
    };

export interface OnTableChangeArg extends Sorting {
  page?: { index: number; size: number };
}

export const MlInMemoryTableBasic = EuiInMemoryTable;
