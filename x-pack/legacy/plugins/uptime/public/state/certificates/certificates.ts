/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { takeLatest } from 'redux-saga/effects';
import { createAsyncAction } from '../actions/utils';
import { GetCertificatesParams } from '../../../common/types/certificates';

import { getAsyncInitialState, handleAsyncAction } from '../reducers/utils';
import { MLJobState } from '../reducers/ml_anomaly';
import { Certificates } from '../../../common/runtime_types/certificates';
import { AppState } from '../index';
import { AsyncInitialState } from '../reducers/types';
import { fetchEffectFactory } from '../effects/fetch_effect';
import { fetchCertificates } from '../api/certificates';

export const getCertificatesActions = createAsyncAction<GetCertificatesParams, Certificates>(
  'GET_CERTIFICATES'
);

interface CertificatesState {
  certificates: AsyncInitialState<Certificates>;
}

const initialState = {
  certificates: getAsyncInitialState(),
};

export const certificatesReducer = handleActions<CertificatesState>(
  {
    ...handleAsyncAction<MLJobState>('certificates', getCertificatesActions),
  },
  initialState
);

export function* fetchCertificatesEffect() {
  yield takeLatest(
    getCertificatesActions.get,
    fetchEffectFactory(
      fetchCertificates,
      getCertificatesActions.success,
      getCertificatesActions.fail
    )
  );
}

export const certificatesSelector = (state: AppState) => state.certificates.certificates.data;
