/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnHeader } from './body/column_headers/column_header';
import { ColumnId } from './body/column_id';
import { SortDirection } from './body/sort';
import { QueryOperator } from './data_providers/data_provider';

/** Invoked when a user clicks the close button to remove a data provider */
export type OnDataProviderRemoved = (providerId: string, andProviderId?: string) => void;

/** Invoked when a user temporarily disables or re-enables a data provider */
export type OnToggleDataProviderEnabled = (toggled: {
  providerId: string;
  enabled: boolean;
  andProviderId?: string;
}) => void;

/** Invoked when a user toggles negation ("boolean NOT") of a data provider */
export type OnToggleDataProviderExcluded = (excluded: {
  providerId: string;
  excluded: boolean;
  andProviderId?: string;
}) => void;

/** Invoked when a user edits the properties of a data provider */
export type OnDataProviderEdited = ({
  andProviderId,
  excluded,
  field,
  id,
  operator,
  providerId,
  value,
}: {
  andProviderId?: string;
  excluded: boolean;
  field: string;
  id: string;
  operator: QueryOperator;
  providerId: string;
  value: string | number;
}) => void;

/** Invoked when a user change the kql query of our data provider */
export type OnChangeDataProviderKqlQuery = (edit: { providerId: string; kqlQuery: string }) => void;

/** Invoked when a user selects a new minimap time range */
export type OnRangeSelected = (range: string) => void;

/** Invoked when a user updates a column's filter */
export type OnFilterChange = (filter: { columnId: ColumnId; filter: string }) => void;

/** Invoked when a column is sorted */
export type OnColumnSorted = (sorted: { columnId: ColumnId; sortDirection: SortDirection }) => void;

export type OnColumnRemoved = (columnId: ColumnId) => void;

export type OnColumnResized = ({ columnId, delta }: { columnId: ColumnId; delta: number }) => void;

/** Invoked when a user clicks to change the number items to show per page */
export type OnChangeItemsPerPage = (itemsPerPage: number) => void;

/** Invoked when a user clicks to load more item */
export type OnLoadMore = (cursor: string, tieBreaker: string) => void;

export type OnChangeDroppableAndProvider = (providerId: string) => void;

/** Invoked when a user pins an event */
export type OnPinEvent = (eventId: string) => void;

/** Invoked when a user checks/un-checks a row */
export type OnRowSelected = ({
  eventIds,
  isSelected,
}: {
  eventIds: string[];
  isSelected: boolean;
}) => void;

/** Invoked when a user checks/un-checks the select all checkbox  */
export type OnSelectAll = ({ isSelected }: { isSelected: boolean }) => void;

/** Invoked when columns are updated */
export type OnUpdateColumns = (columns: ColumnHeader[]) => void;

/** Invoked when a user unpins an event */
export type OnUnPinEvent = (eventId: string) => void;
