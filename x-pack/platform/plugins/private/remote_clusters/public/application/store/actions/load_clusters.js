/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadClusters as sendLoadClustersRequest } from '../../services';

import { LOAD_CLUSTERS_START, LOAD_CLUSTERS_SUCCESS, LOAD_CLUSTERS_FAILURE } from '../action_types';

export const loadClusters = () => async (dispatch) => {
  dispatch({
    type: LOAD_CLUSTERS_START,
  });

  let clusters;
  try {
    clusters = await sendLoadClustersRequest();
  } catch (error) {
    return dispatch({
      type: LOAD_CLUSTERS_FAILURE,
      payload: { error },
    });
  }

  dispatch({
    type: LOAD_CLUSTERS_SUCCESS,
    payload: { clusters },
  });
};
