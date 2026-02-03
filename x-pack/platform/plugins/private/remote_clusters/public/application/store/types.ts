/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThunkAction, ThunkDispatch } from 'redux-thunk';

import type { RemoteCluster } from '../services/http';
import type {
  OPEN_DETAIL_PANEL,
  CLOSE_DETAIL_PANEL,
  LOAD_CLUSTERS_START,
  LOAD_CLUSTERS_SUCCESS,
  LOAD_CLUSTERS_FAILURE,
  REFRESH_CLUSTERS_SUCCESS,
  ADD_CLUSTER_START,
  ADD_CLUSTER_SUCCESS,
  ADD_CLUSTER_FAILURE,
  CLEAR_ADD_CLUSTER_ERRORS,
  EDIT_CLUSTER_START,
  EDIT_CLUSTER_STOP,
  EDIT_CLUSTER_SAVE,
  EDIT_CLUSTER_SUCCESS,
  EDIT_CLUSTER_FAILURE,
  CLEAR_EDIT_CLUSTER_ERRORS,
  REMOVE_CLUSTERS_START,
  REMOVE_CLUSTERS_FINISH,
} from './action_types';

export type { RemoteCluster };

/**
 * State shape for clusters reducer
 */
export interface ClustersState {
  isLoading: boolean;
  clusterLoadError: unknown;
  asList: RemoteCluster[];
  byName: Record<string, RemoteCluster>;
  allNames: string[];
}

/**
 * State shape for detailPanel reducer
 */
export interface DetailPanelState {
  isOpen: boolean;
  clusterName: string | undefined;
}

/**
 * State shape for addCluster reducer
 */
export interface AddClusterState {
  isAdding: boolean;
  error: unknown;
}

/**
 * State shape for removeCluster reducer
 */
export interface RemoveClusterState {
  isRemoving: boolean;
}

/**
 * State shape for editCluster reducer
 */
export interface EditClusterState {
  clusterName: string | undefined;
  isEditing: boolean;
  error: unknown;
}

/**
 * Combined state shape for the remote clusters store
 */
export interface RemoteClustersState {
  clusters: ClustersState;
  detailPanel: DetailPanelState;
  addCluster: AddClusterState;
  removeCluster: RemoveClusterState;
  editCluster: EditClusterState;
}

/**
 * Discriminated union of all action types
 */
export type RemoteClustersAction =
  | { type: typeof OPEN_DETAIL_PANEL; payload: { clusterName: string } }
  | { type: typeof CLOSE_DETAIL_PANEL }
  | { type: typeof LOAD_CLUSTERS_START }
  | { type: typeof LOAD_CLUSTERS_SUCCESS; payload: { clusters: RemoteCluster[] } }
  | { type: typeof LOAD_CLUSTERS_FAILURE; payload: { error: unknown } }
  | { type: typeof REFRESH_CLUSTERS_SUCCESS; payload: { clusters: RemoteCluster[] } }
  | { type: typeof ADD_CLUSTER_START }
  | { type: typeof ADD_CLUSTER_SUCCESS }
  | { type: typeof ADD_CLUSTER_FAILURE; payload: { error: unknown } }
  | { type: typeof CLEAR_ADD_CLUSTER_ERRORS }
  | { type: typeof EDIT_CLUSTER_START; payload: { clusterName: string } }
  | { type: typeof EDIT_CLUSTER_STOP }
  | { type: typeof EDIT_CLUSTER_SAVE }
  | { type: typeof EDIT_CLUSTER_SUCCESS }
  | { type: typeof EDIT_CLUSTER_FAILURE; payload: { error: unknown } }
  | { type: typeof CLEAR_EDIT_CLUSTER_ERRORS }
  | { type: typeof REMOVE_CLUSTERS_START }
  | { type: typeof REMOVE_CLUSTERS_FINISH; payload: string[] };

/**
 * Typed dispatch for the remote clusters store
 */
export type AppDispatch = ThunkDispatch<RemoteClustersState, undefined, RemoteClustersAction>;

/**
 * Typed thunk action for the remote clusters store
 */
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RemoteClustersState,
  undefined,
  RemoteClustersAction
>;
