/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory, { Action } from 'typescript-fsa';
import { i18n } from '@kbn/i18n';
import { takeLatest, select, call, put } from 'redux-saga/effects';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { createSelector } from 'reselect';
import { GraphStoreDependencies, GraphState, fillWorkspace } from '.';
import { reset } from './global';
import { datasourceSelector } from './datasource';
import { liveResponseFieldsSelector, selectedFieldsSelector } from './fields';
import { fetchTopNodes } from '../services/fetch_top_nodes';
import { Workspace } from '../types';
import type { ServerResultNode } from '../types';

const actionCreator = actionCreatorFactory('x-pack/graph/workspace');

export interface WorkspaceState {
  isInitialized: boolean;
}

const initialWorkspaceState: WorkspaceState = {
  isInitialized: false,
};

export const initializeWorkspace = actionCreator('INITIALIZE_WORKSPACE');
export const submitSearch = actionCreator<string>('SUBMIT_SEARCH');

export const workspaceReducer = reducerWithInitialState(initialWorkspaceState)
  .case(reset, () => ({ isInitialized: false }))
  .case(initializeWorkspace, () => ({ isInitialized: true }))
  .build();

export const workspaceSelector = (state: GraphState) => state.workspace;
export const workspaceInitializedSelector = createSelector(
  workspaceSelector,
  (workspace: WorkspaceState) => workspace.isInitialized
);

/**
 * Saga handling filling in top terms into workspace.
 *
 * It will load the top terms of the selected fields, add them to the workspace and fill in the connections.
 */
export const fillWorkspaceSaga = ({
  getWorkspace,
  notifyReact,
  http,
  notifications,
}: GraphStoreDependencies) => {
  function* fetchNodes(): Generator {
    try {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      const state = (yield select()) as GraphState;
      const fields = selectedFieldsSelector(state);
      const datasource = datasourceSelector(state).current;
      if (datasource.type === 'none') {
        return;
      }

      const topTermNodes = (yield call(
        fetchTopNodes,
        http.post,
        datasource.title,
        fields
      )) as ServerResultNode[];
      workspace.mergeGraph({
        nodes: topTermNodes,
        edges: [],
      });
      yield put(initializeWorkspace());
      notifyReact();
      workspace.fillInGraph(fields.length * 10);
    } catch (e) {
      const message = 'body' in e ? e.body.message : e.message;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.graph.fillWorkspaceError', {
          defaultMessage: 'Fetching top terms failed: {message}',
          values: { message },
        }),
      });
    }
  }

  return function* () {
    yield takeLatest(fillWorkspace.match, fetchNodes);
  };
};

export const submitSearchSaga = ({
  getWorkspace,
  handleSearchQueryError,
}: GraphStoreDependencies) => {
  function* submit(action: Action<string>) {
    const searchTerm = action.payload;
    yield put(initializeWorkspace());

    // type casting is safe, at this point workspace should be loaded
    const workspace = getWorkspace() as Workspace;
    const numHops = 2;
    const liveResponseFields = liveResponseFieldsSelector(yield select());

    if (searchTerm.startsWith('{')) {
      try {
        const query = JSON.parse(searchTerm);
        if (query.vertices) {
          // Is a graph explore request
          workspace.callElasticsearch(query);
        } else {
          // Is a regular query DSL query
          workspace.search(query, liveResponseFields, numHops);
        }
      } catch (err) {
        handleSearchQueryError(err);
      }
      return;
    }
    workspace.simpleSearch(searchTerm, liveResponseFields, numHops);
  }

  return function* () {
    yield takeLatest(submitSearch.match, submit);
  };
};
