/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Component, HTMLAttributes, ReactElement, ReactNode } from 'react';

import { Direction, CommonProps, EuiInMemoryTable } from '@elastic/eui';

// Not using an enum here because the original HorizontalAlignment is also a union type of string.
type HorizontalAlignment = 'left' | 'center' | 'right';

type SortableFunc<T> = <T>(item: T) => any;
type Sortable<T> = boolean | SortableFunc<T>;
type DATA_TYPES = any;
type FooterFunc = <T>(payload: { items: T[]; pagination: any }) => ReactNode;
type RenderFunc = (value: any, record?: any) => ReactNode;
export interface FieldDataColumnType<T> {
  field: string;
  name: ReactNode;
  description?: string;
  dataType?: DATA_TYPES;
  width?: string;
  sortable?: Sortable<T>;
  align?: HorizontalAlignment;
  truncateText?: boolean;
  render?: RenderFunc;
  footer?: string | ReactElement | FooterFunc;
  textOnly?: boolean;
  'data-test-subj'?: string;
}

export interface ComputedColumnType<T> {
  render: RenderFunc;
  name?: ReactNode;
  description?: string;
  sortable?: (item: T) => any;
  width?: string;
  truncateText?: boolean;
  'data-test-subj'?: string;
}

type ICON_TYPES = any;
type IconTypesFunc<T> = (item: T) => ICON_TYPES; // (item) => oneOf(ICON_TYPES)
type BUTTON_ICON_COLORS = any;
type ButtonIconColorsFunc<T> = (item: T) => BUTTON_ICON_COLORS; // (item) => oneOf(ICON_BUTTON_COLORS)
interface DefaultItemActionType<T> {
  type?: 'icon' | 'button';
  name: string;
  description: string;
  onClick?(item: T): void;
  href?: string;
  target?: string;
  available?(item: T): boolean;
  enabled?(item: T): boolean;
  isPrimary?: boolean;
  icon?: ICON_TYPES | IconTypesFunc<T>; // required when type is 'icon'
  color?: BUTTON_ICON_COLORS | ButtonIconColorsFunc<T>;
}

interface CustomItemActionType<T> {
  render(item: T, enabled: boolean): ReactNode;
  available?(item: T): boolean;
  enabled?(item: T): boolean;
  isPrimary?: boolean;
}

export interface ExpanderColumnType<T> extends ComputedColumnType<T> {
  align?: HorizontalAlignment;
  isExpander: true;
}

type SupportedItemActionType<T> = DefaultItemActionType<T> | CustomItemActionType<T>;

export interface ActionsColumnType<T> {
  actions: Array<SupportedItemActionType<T>>;
  name?: ReactNode;
  description?: string;
  width?: string;
}

export type ColumnType<T> =
  | ActionsColumnType<T>
  | ComputedColumnType<T>
  | ExpanderColumnType<T>
  | FieldDataColumnType<T>;

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
export type SortDirection = SORT_DIRECTION.ASC | SORT_DIRECTION.DESC | 'asc' | 'desc';
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
  page: { index: number; size: number };
}

type ItemIdTypeFunc = <T>(item: T) => string;
type ItemIdType =
  | string // the name of the item id property
  | ItemIdTypeFunc;

export type EuiInMemoryTableProps<T> = CommonProps & {
  columns: Array<ColumnType<T>>;
  hasActions?: boolean;
  isExpandable?: boolean;
  isSelectable?: boolean;
  items?: T[];
  loading?: boolean;
  message?: HTMLAttributes<HTMLDivElement>;
  error?: string;
  compressed?: boolean;
  search?: SearchType;
  pagination?: PaginationProp;
  sorting?: SortingPropType;
  // Set `allowNeutralSort` to false to force column sorting. Defaults to true.
  allowNeutralSort?: boolean;
  responsive?: boolean;
  selection?: SelectionType;
  itemId?: ItemIdType;
  itemIdToExpandedRowMap?: Record<string, JSX.Element>;
  rowProps?: (item: T) => void | Record<string, any>;
  cellProps?: () => void | Record<string, any>;
  onTableChange?: (arg: OnTableChangeArg) => void;
};

type EuiInMemoryTableType = typeof EuiInMemoryTable;

interface ComponentWithConstructor<T> extends EuiInMemoryTableType {
  new (): Component<T>;
}

export function mlInMemoryTableBasicFactory<T>() {
  return EuiInMemoryTable as ComponentWithConstructor<EuiInMemoryTableProps<T>>;
}
