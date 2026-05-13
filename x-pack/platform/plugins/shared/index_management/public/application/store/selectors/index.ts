/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pager, EuiSearchBar } from '@elastic/eui';

import { createSelector } from 'reselect';
import type { Index } from '../../../../common';
import { indexStatusLabels } from '../../lib/index_status_labels';
import { sortTable } from '../../services';
import { extensionsService } from './extension_service';
import type { IndexManagementState, RowStatusState, TableState } from '../types';

export { extensionsService };
export { setExtensionsService } from './extension_service';

export const getIndices = (state: IndexManagementState) => state.indices.byId;
export const indicesLoading = (state: IndexManagementState) => state.indices.loading;
export const indicesError = (state: IndexManagementState) => state.indices.error;
export const indicesEnrichmentErrors = (state: IndexManagementState) =>
  state.indices.enrichmentErrors;
export const getIndicesAsArray = (state: IndexManagementState) => Object.values(state.indices.byId);
export const getIndicesByName = (state: IndexManagementState, indexNames: string[]) => {
  const indices = getIndices(state);
  return indexNames.map((indexName) => indices[indexName]);
};
export const getIndexByIndexName = (state: IndexManagementState, name: string) =>
  getIndices(state)[name];
export const getFilteredIds = (state: IndexManagementState) => state.indices.allIds;
export const getRowStatuses = (state: IndexManagementState): RowStatusState => state.rowStatus;
export const getTableState = (state: IndexManagementState): TableState => state.tableState;
export const getTableLocationProp = (_: IndexManagementState, props: { location: Location }) =>
  props.location;
export const getAllIds = (state: IndexManagementState) => state.indices.allIds;
export const getIndexStatusByIndexName = (state: IndexManagementState, indexName: string) => {
  const indices = getIndices(state);
  const { status } = indices[indexName] || {};
  return status;
};
const defaultFilterFields = ['name'];

const filterByToggles = (indices: Index[], toggleNameToVisibleMap: Record<string, boolean>) => {
  const togglesByName = extensionsService.toggles.reduce<
    Record<string, (typeof extensionsService.toggles)[number]>
  >(
    (byName, toggle) => ({
      ...byName,
      [toggle.name]: toggle,
    }),
    {}
  );

  const toggleNames = Object.keys(togglesByName);
  if (!toggleNames.length) {
    return indices;
  }
  return indices.filter((index) => {
    return toggleNames.every((toggleName) => {
      // if an index matches a toggle, it's only shown if the toggle is set to "enabled"
      // for example, a hidden index is only shown when the "include hidden" toggle is "enabled"
      if (togglesByName[toggleName].matchIndex(index)) {
        return toggleNameToVisibleMap[toggleName] === true;
      }
      // otherwise the index is shown by default
      return true;
    });
  });
};

export const getFilteredIndices = createSelector(
  getIndices,
  getAllIds,
  getTableState,
  (indices, allIds, tableState) => {
    let indexArray = allIds.map((indexName) => indices[indexName]);
    indexArray = filterByToggles(indexArray, tableState.toggleNameToVisibleMap);
    const filter = tableState.filter || EuiSearchBar.Query.MATCH_ALL;
    return EuiSearchBar.Query.execute(filter, indexArray, {
      defaultFields: defaultFilterFields,
    });
  }
);
export const getTotalItems = createSelector(getFilteredIndices, (filteredIndices) => {
  return Object.keys(filteredIndices).length;
});

export const getPager = createSelector(
  getTableState,
  getTotalItems,
  ({ currentPage, pageSize }, totalItems) => {
    return new Pager(totalItems, pageSize, currentPage);
  }
);
export const getPageOfIndices = createSelector(
  getFilteredIndices,
  getTableState,
  getRowStatuses,
  getPager,
  (filteredIndices, tableState, rowStatuses, pager) => {
    const sortedIndexes = sortTable(
      filteredIndices,
      tableState.sortField,
      tableState.isSortAscending,
      extensionsService
    );
    const { firstItemIndex, lastItemIndex } = pager;
    const pagedIndexes = sortedIndexes.slice(firstItemIndex, lastItemIndex + 1);
    return pagedIndexes.map((index) => {
      if (index.status) {
        const status =
          indexStatusLabels[rowStatuses[index.name]] || // user friendly version of row status
          rowStatuses[index.name] || // row status
          indexStatusLabels[index.status] || // user friendly version of index status
          index.status; // index status
        return {
          ...index,
          status,
        };
      }

      return index;
    });
  }
);

export const getFilter = createSelector(getTableState, ({ filter }) => filter);

export const isSortAscending = createSelector(
  getTableState,
  ({ isSortAscending: ascending }) => ascending
);

export const getSortField = createSelector(getTableState, ({ sortField }) => sortField);
