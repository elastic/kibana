/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemoteClustersState } from '../types';
import type { RequestError } from '../../../types';

function hasKey<K extends PropertyKey>(value: unknown, key: K): value is Record<K, unknown> {
  return value !== null && typeof value === 'object' && key in value;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRequestError(error: unknown): error is RequestError {
  if (!hasKey(error, 'message') || typeof error.message !== 'string') {
    return false;
  }

  if (hasKey(error, 'cause') && error.cause !== undefined && !isStringArray(error.cause)) {
    return false;
  }

  return true;
}

export const getClustersList = (state: RemoteClustersState) => state.clusters.asList;
export const getClustersByName = (state: RemoteClustersState) => state.clusters.byName;
export const getClusterByName = (state: RemoteClustersState, name: string) =>
  getClustersByName(state)[name];

export const isDetailPanelOpen = (state: RemoteClustersState) => state.detailPanel.isOpen;
export const getDetailPanelCluster = (state: RemoteClustersState) =>
  getClusterByName(state, state.detailPanel.clusterName!);
export const getDetailPanelClusterName = (state: RemoteClustersState) =>
  state.detailPanel.clusterName;

export const isLoading = (state: RemoteClustersState) => state.clusters.isLoading;
export const clusterLoadError = (state: RemoteClustersState) => state.clusters.clusterLoadError;

export const isAddingCluster = (state: RemoteClustersState) => state.addCluster.isAdding;
export const getAddClusterError = (state: RemoteClustersState): RequestError | undefined => {
  const error = state.addCluster.error;
  return isRequestError(error) ? error : undefined;
};

export const getEditedCluster = (state: RemoteClustersState) =>
  getClustersByName(state)[state.editCluster.clusterName!];
export const isEditingCluster = (state: RemoteClustersState) => state.editCluster.isEditing;
export const getEditClusterError = (state: RemoteClustersState): RequestError | undefined => {
  const error = state.editCluster.error;
  return isRequestError(error) ? error : undefined;
};

export const isRemovingCluster = (state: RemoteClustersState) => state.removeCluster.isRemoving;
