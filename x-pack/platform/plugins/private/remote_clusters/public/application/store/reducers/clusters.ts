/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LOAD_CLUSTERS_START,
  LOAD_CLUSTERS_SUCCESS,
  LOAD_CLUSTERS_FAILURE,
  REFRESH_CLUSTERS_SUCCESS,
  REMOVE_CLUSTERS_FINISH,
} from '../action_types';
import type { ClustersState, RemoteCluster, RemoteClustersAction } from '../types';

const initialState: ClustersState = {
  isLoading: false,
  clusterLoadError: null,
  asList: [],
  byName: {},
  allNames: [],
};

// Convert an  Array of clusters to an object where
// each key is the cluster name
const mapClustersToNames = (clustersList: RemoteCluster[]) =>
  clustersList.reduce<Record<string, RemoteCluster>>(
    (byName, cluster) => ({
      ...byName,
      [cluster.name]: cluster,
    }),
    {}
  );

const getClustersNames = (clustersList: RemoteCluster[]) =>
  clustersList.map((cluster) => cluster.name);

export function clusters(state = initialState, action: RemoteClustersAction): ClustersState {
  switch (action.type) {
    case LOAD_CLUSTERS_START:
      return {
        ...state,
        isLoading: true,
      };

    case LOAD_CLUSTERS_SUCCESS: {
      const { clusters: clustersList } = action.payload;
      return {
        ...state,
        asList: [...clustersList],
        byName: mapClustersToNames(clustersList),
        allNames: getClustersNames(clustersList),
        isLoading: false,
        clusterLoadError: null,
      };
    }

    case REFRESH_CLUSTERS_SUCCESS: {
      const { clusters: clustersList } = action.payload;
      return {
        ...state,
        asList: [...clustersList],
        byName: mapClustersToNames(clustersList),
        allNames: getClustersNames(clustersList),
      };
    }

    case LOAD_CLUSTERS_FAILURE: {
      const { error } = action.payload;
      return {
        ...state,
        isLoading: false,
        clusterLoadError: error,
      };
    }

    case REMOVE_CLUSTERS_FINISH:
      const clustersRemoved = action.payload;

      const updatedList = Object.keys(state.byName)
        .filter((name) => clustersRemoved.indexOf(name) < 0)
        .map((name) => state.byName[name]);

      return {
        ...state,
        asList: updatedList,
        byName: mapClustersToNames(updatedList),
        allNames: getClustersNames(updatedList),
      };

    default:
      return state;
  }
}
