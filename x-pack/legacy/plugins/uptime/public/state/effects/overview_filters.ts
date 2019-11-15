/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { call, put, takeLatest, select } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import {
  FETCH_OVERVIEW_FILTERS,
  GetOverviewFiltersPayload,
  fetchOverviewFiltersFail,
  fetchOverviewFiltersSuccess,
} from '../actions';
import { fetchOverviewFilters } from '../api';
import { getBasePath } from '../selectors';

function* overviewFiltersSaga(action: Action<GetOverviewFiltersPayload>) {
  try {
    if (!action.payload) {
      yield put(
        fetchOverviewFiltersFail(
          new Error('Cannot fetch overview filters for undefined parameters')
        )
      );
      return;
    }
    const {
      payload: { ...params },
    } = action;
    const basePath = yield select(getBasePath);
    const response = yield call(fetchOverviewFilters, {
      basePath,
      ...params,
    });
    yield put(fetchOverviewFiltersSuccess(response));
  } catch (error) {
    yield put(fetchOverviewFiltersFail(error));
  }
}

export function* fetchOverviewFiltersSaga() {
  yield takeLatest(FETCH_OVERVIEW_FILTERS, overviewFiltersSaga);
}
