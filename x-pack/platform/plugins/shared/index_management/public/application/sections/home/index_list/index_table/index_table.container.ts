/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { History, Location } from 'history';
import { connect } from 'react-redux';
import type { ConnectedProps } from 'react-redux';
import type { Query } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import {
  getPageOfIndices,
  getPager,
  getFilter,
  getSortField,
  isSortAscending,
  getIndicesAsArray,
  indicesLoading,
  indicesError,
  indicesEnrichmentErrors,
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
import type { IndexManagementState, AppDispatch } from '../../../../store/types';

const mapStateToProps = (state: IndexManagementState) => {
  return {
    allIndices: getIndicesAsArray(state),
    indices: getPageOfIndices(state),
    pager: getPager(state),
    filter: getFilter(state),
    sortField: getSortField(state),
    isSortAscending: isSortAscending(state),
    indicesLoading: indicesLoading(state),
    indicesError: indicesError(state),
    indicesEnrichmentErrors: indicesEnrichmentErrors(state),
    toggleNameToVisibleMap: getTableState(state).toggleNameToVisibleMap,
  };
};

const mapDispatchToProps = (dispatch: AppDispatch) => {
  return {
    filterChanged: (filter: string | Query) => {
      dispatch(filterChanged({ filter }));
    },
    pageChanged: (pageNumber: number) => {
      dispatch(pageChanged({ pageNumber }));
    },
    pageSizeChanged: (pageSize: number) => {
      dispatch(pageSizeChanged({ pageSize }));
    },
    sortChanged: (sortFieldVal: string, isSortAsc: boolean) => {
      dispatch(
        sortChanged({
          sortField: sortFieldVal,
          isSortAscending: isSortAsc,
        })
      );
    },
    toggleChanged: (toggleName: string, toggleValue: boolean) => {
      dispatch(toggleChanged({ toggleName, toggleValue }));
    },
    loadIndices: () => {
      dispatch(loadIndices());
    },
    performExtensionAction: (
      requestMethod: (indexNames: string[], http: HttpSetup) => Promise<void>,
      successMessage: string,
      indexNames: string[]
    ) => {
      dispatch(
        performExtensionAction({
          requestMethod,
          successMessage,
          indexNames,
        })
      );
    },
  };
};

const connector = connect(mapStateToProps, mapDispatchToProps);
export type PropsFromRedux = ConnectedProps<typeof connector>;

export interface IndexTableOwnProps {
  history: History;
  location: Location;
  http: HttpSetup;
}

export const IndexTable: ComponentType<IndexTableOwnProps> = connector(PresentationComponent);
