/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux';
import type { ThunkAction, ThunkDispatch } from 'redux-thunk';
import type { ApiStatus } from '../../../../common/types';
import * as t from '../action_types';
import { API_STATUS } from '../../constants';
import type { CcrState } from '../reducers';
import type { CcrApiError } from '../../services/http_error';
import { toCcrApiError } from '../../services/http_error';

export interface ApiRequestStartParams {
  label: string;
  scope: string;
  status?: ApiStatus;
}

export const apiRequestStart = ({
  label,
  scope,
  status = API_STATUS.LOADING,
}: ApiRequestStartParams) => ({
  type: t.API_REQUEST_START,
  payload: { label, scope, status },
});

export interface ApiRequestEndParams {
  label: string;
  scope: string;
}

export const apiRequestEnd = ({ label, scope }: ApiRequestEndParams) => ({
  type: t.API_REQUEST_END,
  payload: { label, scope },
});

export interface SetApiErrorParams {
  error: CcrApiError;
  scope: string;
}

export const setApiError = ({ error, scope }: SetApiErrorParams) => ({
  type: t.API_ERROR_SET,
  payload: { error, scope },
});

export const clearApiError = (scope: string) => ({
  type: t.API_ERROR_SET,
  payload: { error: null, scope },
});

type AppDispatch = ThunkDispatch<CcrState, undefined, AnyAction>;

export interface SendApiRequestParams<TResponse = void> {
  label: string;
  scope: string;
  status?: ApiStatus;
  handler: (dispatch: AppDispatch) => Promise<TResponse>;
  onSuccess?: (response: TResponse, dispatch: AppDispatch, getState: () => CcrState) => void;
  onError?: (error: CcrApiError, dispatch: AppDispatch, getState: () => CcrState) => void;
}

export const sendApiRequest =
  <TResponse = void>({
    label,
    scope,
    status,
    handler,
    onSuccess = () => undefined,
    onError = () => undefined,
  }: SendApiRequestParams<TResponse>): ThunkAction<Promise<void>, CcrState, undefined, AnyAction> =>
  async (dispatch, getState) => {
    dispatch(clearApiError(scope));
    dispatch(apiRequestStart({ label, scope, status }));

    try {
      const response = await handler(dispatch);

      dispatch(apiRequestEnd({ label, scope }));
      dispatch({ type: `${label}_SUCCESS`, payload: response });

      onSuccess(response, dispatch, getState);
    } catch (error) {
      const apiError = toCcrApiError(error);
      dispatch(apiRequestEnd({ label, scope }));
      dispatch(setApiError({ error: apiError, scope }));
      dispatch({ type: `${label}_FAILURE`, payload: apiError });

      onError(apiError, dispatch, getState);
    }
  };
