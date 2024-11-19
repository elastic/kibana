/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import type {
  ColumnHeaderOptions,
  SessionViewConfig,
  SortColumnTable,
  ViewSelection,
} from '../../common/types';
import type { InitialyzeDataTableSettings, DataTablePersistInput } from './types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/data-table');

export const createDataTable = actionCreator<DataTablePersistInput>('CREATE_DATA_TABLE');

export const upsertColumn = actionCreator<{
  column: ColumnHeaderOptions;
  id: string;
  index: number;
}>('UPSERT_COLUMN');

export const applyDeltaToColumnWidth = actionCreator<{
  id: string;
  columnId: string;
  delta: number;
}>('APPLY_DELTA_TO_COLUMN_WIDTH');

export const updateColumnOrder = actionCreator<{
  columnIds: string[];
  id: string;
}>('UPDATE_COLUMN_ORDER');

export const updateColumnWidth = actionCreator<{
  columnId: string;
  id: string;
  width: number;
}>('UPDATE_COLUMN_WIDTH');

export const removeColumn = actionCreator<{
  id: string;
  columnId: string;
}>('REMOVE_COLUMN');

export const updateIsLoading = actionCreator<{
  id: string;
  isLoading: boolean;
}>('UPDATE_LOADING');

export const updateColumns = actionCreator<{
  id: string;
  columns: ColumnHeaderOptions[];
}>('UPDATE_COLUMNS');

export const updateItemsPerPage = actionCreator<{ id: string; itemsPerPage: number }>(
  'UPDATE_ITEMS_PER_PAGE'
);

export const updateItemsPerPageOptions = actionCreator<{
  id: string;
  itemsPerPageOptions: number[];
}>('UPDATE_ITEMS_PER_PAGE_OPTIONS');

export const updateSort = actionCreator<{ id: string; sort: SortColumnTable[] }>('UPDATE_SORT');

export const setSelected = actionCreator<{
  id: string;
  eventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  isSelected: boolean;
  isSelectAllChecked: boolean;
}>('SET_DATA_TABLE_SELECTED');

export const clearSelected = actionCreator<{
  id: string;
}>('CLEAR_DATA_TABLE_SELECTED');

export const setEventsLoading = actionCreator<{
  id: string;
  eventIds: string[];
  isLoading: boolean;
}>('SET_DATA_TABLE_EVENTS_LOADING');

export const clearEventsLoading = actionCreator<{
  id: string;
}>('CLEAR_DATA_TABLE_EVENTS_LOADING');

export const setEventsDeleted = actionCreator<{
  id: string;
  eventIds: string[];
  isDeleted: boolean;
}>('SET_DATA_TABLE_EVENTS_DELETED');

export const clearEventsDeleted = actionCreator<{
  id: string;
}>('CLEAR_DATA_TABLE_EVENTS_DELETED');

export const initializeDataTableSettings =
  actionCreator<InitialyzeDataTableSettings>('INITIALIZE_DATA_TABLE');

export const setDataTableSelectAll = actionCreator<{ id: string; selectAll: boolean }>(
  'SET_DATA_TABLE_SELECT_ALL'
);

export const updateGraphEventId = actionCreator<{ id: string; graphEventId: string }>(
  'UPDATE_DATA_TABLE_GRAPH_EVENT_ID'
);

export const updateSessionViewConfig = actionCreator<{
  id: string;
  sessionViewConfig: SessionViewConfig | null;
}>('UPDATE_DATA_TABLE_SESSION_VIEW_CONFIG');

export const setTableUpdatedAt = actionCreator<{ id: string; updated: number }>(
  'SET_TABLE_UPDATED_AT'
);

export const updateTotalCount = actionCreator<{ id: string; totalCount: number }>(
  'UPDATE_TOTAL_COUNT'
);

export const changeViewMode = actionCreator<{
  id: string;
  viewMode: ViewSelection;
}>('CHANGE_ALERT_TABLE_VIEW_MODE');

export const updateShowBuildingBlockAlertsFilter = actionCreator<{
  id: string;
  showBuildingBlockAlerts: boolean;
}>('UPDATE_BUILDING_BLOCK_ALERTS_FILTER');

export const updateShowThreatIndicatorAlertsFilter = actionCreator<{
  id: string;
  showOnlyThreatIndicatorAlerts: boolean;
}>('UPDATE_SHOW_THREAT_INDICATOR_ALERTS_FILTER');
