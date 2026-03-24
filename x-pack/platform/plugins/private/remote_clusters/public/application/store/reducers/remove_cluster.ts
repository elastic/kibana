/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REMOVE_CLUSTERS_START, REMOVE_CLUSTERS_FINISH } from '../action_types';
import type { RemoveClusterState, RemoteClustersAction } from '../types';

const initialState: RemoveClusterState = {
  isRemoving: false,
};

export function removeCluster(
  state = initialState,
  action: RemoteClustersAction
): RemoveClusterState {
  switch (action.type) {
    case REMOVE_CLUSTERS_START:
      return {
        isRemoving: true,
      };

    case REMOVE_CLUSTERS_FINISH:
      return {
        isRemoving: false,
      };

    default:
      return state;
  }
}
