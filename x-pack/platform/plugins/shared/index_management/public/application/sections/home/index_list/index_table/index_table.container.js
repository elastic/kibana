/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {
  getPageOfIndices,
  getPager,
  getFilter,
  getSortField,
  isSortAscending,
  getIndicesAsArray,
  indicesLoading,
  indicesError,
  getTableState,
} from '../../../../store/selectors';
import {
  filterChanged,
  pageChanged,
  pageSizeChanged,
  sortChanged,
  loadIndices,
  toggleChanged,
  performExtensionAction,
} from '../../../../store/actions';

import { IndexTable as PresentationComponent } from './index_table';

const mapStateToProps = (state, props) => {
  return {
    allIndices: getIndicesAsArray(state),
    indices: getPageOfIndices(state, props),
    pager: getPager(state, props),
    filter: getFilter(state),
    sortField: getSortField(state),
    isSortAscending: isSortAscending(state),
    indicesLoading: indicesLoading(state),
    indicesError: indicesError(state),
    toggleNameToVisibleMap: getTableState(state).toggleNameToVisibleMap,
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
    toggleChanged: (toggleName, toggleValue) => {
      dispatch(toggleChanged({ toggleName, toggleValue }));
    },
    loadIndices: () => {
      dispatch(loadIndices());
    },
    performExtensionAction: (requestMethod, successMessage, indexNames) => {
      dispatch(performExtensionAction({ requestMethod, successMessage, indexNames }));
    },
  };
};

export const IndexTable = withRouter(
  connect(mapStateToProps, mapDispatchToProps)(PresentationComponent)
);
