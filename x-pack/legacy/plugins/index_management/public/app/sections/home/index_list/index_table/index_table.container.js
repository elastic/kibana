/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import {
  getDetailPanelIndexName,
  getPageOfIndices,
  getPager,
  getFilter,
  isDetailPanelOpen,
  showSystemIndices,
  getSortField,
  isSortAscending,
  getIndicesAsArray,
  indicesLoading,
  indicesError,
  getTableState
} from '../../../../store/selectors';
import {
  filterChanged,
  closeDetailPanel,
  openDetailPanel,
  pageChanged,
  pageSizeChanged,
  sortChanged,
  showSystemIndicesChanged,
  loadIndices,
  reloadIndices,
  toggleChanged
} from '../../../../store/actions';

import { IndexTable as PresentationComponent } from './index_table';

const mapStateToProps = (state) => {
  return {
    allIndices: getIndicesAsArray(state),
    isDetailPanelOpen: isDetailPanelOpen(state),
    detailPanelIndexName: getDetailPanelIndexName(state),
    indices: getPageOfIndices(state),
    pager: getPager(state),
    filter: getFilter(state),
    showSystemIndices: showSystemIndices(state),
    sortField: getSortField(state),
    isSortAscending: isSortAscending(state),
    indicesLoading: indicesLoading(state),
    indicesError: indicesError(state),
    toggleNameToVisibleMap: getTableState(state).toggleNameToVisibleMap
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    filterChanged: (filter) => {
      dispatch(filterChanged({ filter }));
    },
    pageChanged: (pageNumber) => {
      dispatch(pageChanged({ pageNumber }));
    },
    pageSizeChanged: (pageSize) => {
      dispatch(pageSizeChanged({ pageSize }));
    },
    sortChanged: (sortField, isSortAscending) => {
      dispatch(sortChanged({ sortField, isSortAscending }));
    },
    showSystemIndicesChanged: (showSystemIndices) => {
      dispatch(showSystemIndicesChanged({ showSystemIndices }));
    },
    toggleChanged: (toggleName, toggleValue) => {
      dispatch(toggleChanged({ toggleName, toggleValue }));
    },
    openDetailPanel: (indexName) => {
      dispatch(openDetailPanel({ indexName }));
    },
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
    loadIndices: () => {
      dispatch(loadIndices());
    },
    reloadIndices: () => {
      dispatch(reloadIndices());
    }
  };
};

export const IndexTable = connect(
  mapStateToProps,
  mapDispatchToProps
)(PresentationComponent);
