/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Component, ReactNode } from 'react';

import {
  EuiInMemoryTable,
  Direction,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';

// At some point this could maybe solved with a generic <T>.
type Item = any;

export type FieldDataColumnType<T> = EuiTableFieldDataColumnType<T>;

export type ComputedColumnType<T> = EuiTableComputedColumnType<T>;

export interface ExpanderColumnType<T> extends ComputedColumnType<T> {
  isExpander: true;
}

export type ActionsColumnType<T> = EuiTableActionsColumnType<T>;

export type ColumnType =
  | ActionsColumnType
  | ComputedColumnType
  | ExpanderColumnType
  | FieldDataColumnType;

type QueryType = any;

interface Schema {
  strict?: boolean;
  fields?: Record<string, any>;
  flags?: string[];
}

interface SearchBoxConfigPropTypes {
  placeholder?: string;
  incremental?: boolean;
  schema?: Schema;
}

interface Box {
  placeholder?: string;
  incremental?: boolean;
  // here we enable the user to just assign 'true' to the schema, in which case
  // we will auto-generate it out of the columns configuration
  schema?: boolean | SearchBoxConfigPropTypes['schema'];
}

type SearchFiltersFiltersType = any;

interface ExecuteQueryOptions {
  defaultFields: string[];
  isClauseMatcher: () => void;
  explain: boolean;
}

type SearchType =
  | boolean
  | {
      toolsLeft?: ReactNode;
      toolsRight?: ReactNode;
      defaultQuery?: QueryType;
      box?: Box;
      filters?: SearchFiltersFiltersType;
      onChange?: (arg: any) => void;
      executeQueryOptions?: ExecuteQueryOptions;
    };

interface PageSizeOptions {
  pageSizeOptions: number[];
}
interface InitialPageOptions extends PageSizeOptions {
  initialPageIndex: number;
  initialPageSize: number;
}
type PaginationProp = boolean | PageSizeOptions | InitialPageOptions;

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

type SelectionType = any;

export interface OnTableChangeArg extends Sorting {
  page?: { index: number; size: number };
}

type ItemIdTypeFunc = (item: Item) => string;
type ItemIdType =
  | string // the name of the item id property
  | ItemIdTypeFunc;

interface ComponentWithConstructor<T> extends Component {
  new (): Component<T>;
}

export const MlInMemoryTableBasic: typeof EuiInMemoryTable = EuiInMemoryTable;
