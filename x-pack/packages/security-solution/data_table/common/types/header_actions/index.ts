/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellValueElementProps, EuiDataGridColumn } from '@elastic/eui';
import type { IFieldSubType } from '@kbn/es-query';
import type { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';
import type { ComponentType, JSXElementConstructor } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { OnRowSelected } from '../../../components/data_table/types';
import type { SortColumnTable } from '../data_table';
import { SetEventsDeleted, SetEventsLoading } from '..';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** Uniquely identifies a column */
export type ColumnId = string;

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
  | 'isExpandable'
  | 'isResizable'
> & {
  aggregatable?: boolean;
  category?: string;
  columnHeaderType: ColumnHeaderType;
  description?: string | null;
  esTypes?: string[];
  example?: string | number | null;
  format?: string;
  linkField?: string;
  placeholder?: string;
  subType?: IFieldSubType;
  type?: string;
};

export interface HeaderActionProps {
  width: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  fieldBrowserOptions?: FieldBrowserOptions;
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onSelectAll: ({ isSelected }: { isSelected: boolean }) => void;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  sort: SortColumnTable[];
  tabType: string;
  timelineId: string;
}

export type HeaderCellRender = ComponentType | ComponentType<HeaderActionProps>;

type GenericActionRowCellRenderProps = Pick<
  EuiDataGridCellValueElementProps,
  'rowIndex' | 'columnId'
>;

export type RowCellRender =
  | JSXElementConstructor<GenericActionRowCellRenderProps>
  | ((props: GenericActionRowCellRenderProps) => JSX.Element)
  | JSXElementConstructor<ActionProps>
  | ((props: ActionProps) => JSX.Element);

export interface ActionProps {
  action?: RowCellRender;
  ariaRowindex: number;
  checked: boolean;
  columnId: string;
  columnValues: string;
  data: TimelineNonEcsData[];
  disabled?: boolean;
  ecsData: Ecs;
  eventId: string;
  eventIdToNoteIds?: Readonly<Record<string, string[]>>;
  index: number;
  isEventPinned?: boolean;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  refetch?: () => void;
  rowIndex: number;
  setEventsDeleted: SetEventsDeleted;
  setEventsLoading: SetEventsLoading;
  showCheckboxes: boolean;
  showNotes?: boolean;
  tabType?: string;
  timelineId: string;
  toggleShowNotes?: () => void;
  width?: number;
}
