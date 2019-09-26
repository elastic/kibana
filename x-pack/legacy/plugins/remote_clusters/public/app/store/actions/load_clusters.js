/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  loadClusters as sendLoadClustersRequest,
  showApiError,
} from '../../services';

import {
  LOAD_CLUSTERS_START,
  LOAD_CLUSTERS_SUCCESS,
  LOAD_CLUSTERS_FAILURE,
} from '../action_types';

export const loadClusters = () => async (dispatch) => {
  dispatch({
    type: LOAD_CLUSTERS_START,
  });

  let clusters;
  try {
    clusters = await sendLoadClustersRequest();
  } catch (error) {
    dispatch({
      type: LOAD_CLUSTERS_FAILURE,
      payload: { error }
    });

    return showApiError(error, i18n.translate('xpack.remoteClusters.loadAction.errorTitle', {
      defaultMessage: 'Error loading remote clusters',
    }));
  }

  dispatch({
    type: LOAD_CLUSTERS_SUCCESS,
    payload: { clusters }
  });
};
