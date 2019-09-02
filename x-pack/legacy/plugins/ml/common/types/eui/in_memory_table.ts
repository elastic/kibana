/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Component, HTMLAttributes, ReactElement, ReactNode } from 'react';

import { CommonProps, EuiInMemoryTable } from '@elastic/eui';

// At some point this could maybe solved with a generic <T>.
type Item = any;

// Not using an enum here because the original HorizontalAlignment is also a union type of string.
type HorizontalAlignment = 'left' | 'center' | 'right';

type SortableFunc = (item: Item) => any;
type Sortable = boolean | SortableFunc;
type DATA_TYPES = any;
type FooterFunc = (payload: { items: Item[]; pagination: any }) => ReactNode;
type RenderFunc = (value: any, record?: any) => ReactNode;
export interface FieldDataColumnType {
  field: string;
  name: ReactNode;
  description?: string;
  dataType?: DATA_TYPES;
  width?: string;
  sortable?: Sortable;
  align?: HorizontalAlignment;
  truncateText?: boolean;
  render?: RenderFunc;
  footer?: string | ReactElement | FooterFunc;
}

export interface ComputedColumnType {
  render: RenderFunc;
  name?: ReactNode;
  description?: string;
  sortable?: (item: Item) => any;
  width?: string;
  truncateText?: boolean;
}

type ICON_TYPES = any;
type IconTypesFunc = (item: Item) => ICON_TYPES; // (item) => oneOf(ICON_TYPES)
type BUTTON_ICON_COLORS = any;
type ButtonIconColorsFunc = (item: Item) => BUTTON_ICON_COLORS; // (item) => oneOf(ICON_BUTTON_COLORS)
interface DefaultItemActionType {
  type?: 'icon' | 'button';
  name: string;
  description: string;
  onClick?(item: Item): void;
  href?: string;
  target?: string;
  available?(item: Item): boolean;
  enabled?(item: Item): boolean;
  isPrimary?: boolean;
  icon?: ICON_TYPES | IconTypesFunc; // required when type is 'icon'
  color?: BUTTON_ICON_COLORS | ButtonIconColorsFunc;
}

interface CustomItemActionType {
  render(item: Item, enabled: boolean): ReactNode;
  available?(item: Item): boolean;
  enabled?(item: Item): boolean;
  isPrimary?: boolean;
}

export interface ExpanderColumnType {
  align?: HorizontalAlignment;
  width?: string;
  isExpander: boolean;
  render: RenderFunc;
}

type SupportedItemActionType = DefaultItemActionType | CustomItemActionType;

export interface ActionsColumnType {
  actions: SupportedItemActionType[];
  name?: ReactNode;
  description?: string;
  width?: string;
}

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
export interface Sorting {
  sort: {
    field: string;
    direction: SortDirection;
  };
}
export type SortingPropType = boolean | Sorting;

type SelectionType = any;

export interface OnTableChangeArg extends Sorting {
  page: { index: number; size: number };
}

type ItemIdTypeFunc = (item: Item) => string;
type ItemIdType =
  | string // the name of the item id property
  | ItemIdTypeFunc;

export type EuiInMemoryTableProps = CommonProps & {
  columns: ColumnType[];
  hasActions?: boolean;
  isExpandable?: boolean;
  isSelectable?: boolean;
  items?: Item[];
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
  itemIdToExpandedRowMap?: Record<string, Item>;
  rowProps?: () => void | Record<string, any>;
  cellProps?: () => void | Record<string, any>;
  onTableChange?: (arg: OnTableChangeArg) => void;
};

interface ComponentWithConstructor<T> extends Component {
  new (): Component<T>;
}

export const MlInMemoryTable = (EuiInMemoryTable as any) as ComponentWithConstructor<
  EuiInMemoryTableProps
>;
