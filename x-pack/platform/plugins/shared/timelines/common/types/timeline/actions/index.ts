/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn, EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { IFieldSubType } from '@kbn/es-query';
import { ReactNode } from 'react';
import { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { BrowserFields, TimelineNonEcsData } from '../../../search_strategy';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

export const defaultColumnHeaderType: ColumnHeaderType = 'not-filtered';

/**
 * A `DataTableCellAction` function accepts `data`, where each row of data is
 * represented as a `TimelineNonEcsData[]`. For example, `data[0]` would
 * contain a `TimelineNonEcsData[]` with the first row of data.
 *
 * A `DataTableCellAction` returns a function that has access to all the
 * `EuiDataGridColumnCellActionProps`, _plus_ access to `data`,
 *  which enables code like the following example to be written:
 *
 * Example:
 * ```
 * ({ data }: { data: TimelineNonEcsData[][] }) => ({ rowIndex, columnId, Component }) => {
 *   const value = getMappedNonEcsValue({
 *     data: data[rowIndex], // access a specific row's values
 *     fieldName: columnId,
 *   });
 *
 *   return (
 *     <Component onClick={() => alert(`row ${rowIndex} col ${columnId} has value ${value}`)} iconType="heart">
 *       {'Love it'}
 *      </Component>
 *   );
 * };
 * ```
 */
export type DataTableCellAction = ({
  browserFields,
  data,
  ecsData,
  header,
  pageSize,
  scopeId,
  closeCellPopover,
}: {
  browserFields: BrowserFields;
  /** each row of data is represented as one TimelineNonEcsData[] */
  data: TimelineNonEcsData[][];
  ecsData: Ecs[];
  header?: ColumnHeaderOptions;
  pageSize: number;
  scopeId: string;
  closeCellPopover?: () => void;
}) => (props: EuiDataGridColumnCellActionProps) => ReactNode;

/** The specification of a column header */
export type ColumnHeaderOptions = Pick<
  EuiDataGridColumn,
  | 'actions'
  | 'defaultSortDirection'
  | 'display'
  | 'displayAsText'
  | 'id'
  | 'initialWidth'
  | 'isSortable'
  | 'schema'
> & {
  aggregatable?: boolean;
  searchable?: boolean;
  dataTableCellActions?: DataTableCellAction[];
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string | null;
  esTypes?: string[];
  example?: string | number | null;
  format?: SerializedFieldFormat;
  linkField?: string;
  placeholder?: string;
  subType?: IFieldSubType;
  type?: string;
};
