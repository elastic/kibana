/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { loadIndices as request } from '../../services';

export const loadIndicesStart = createAction('INDEX_MANAGEMENT_LOAD_INDICES_START');
export const loadIndicesSuccess = createAction('INDEX_MANAGEMENT_LOAD_INDICES_SUCCESS');
export const loadIndicesError = createAction('INDEX_MANAGEMENT_LOAD_INDICES_ERROR');
export const loadIndicesEnrichmentError = createAction(
  'INDEX_MANAGEMENT_LOAD_INDICES_ENRICHMENT_ERROR'
);

let abortController;

export const loadIndices = () => async (dispatch) => {
  if (abortController && !abortController.signal.aborted) {
    abortController.abort();
  }

  abortController = new AbortController();

  dispatch(loadIndicesStart());
  try {
    await request(
      (indices) => dispatch(loadIndicesSuccess({ indices })),
      (source) => dispatch(loadIndicesEnrichmentError({ source })),
      abortController.signal
    );
  } catch (error) {
    return dispatch(loadIndicesError(error));
  }
};
