/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import { Option, fromNullable } from 'fp-ts/lib/Option';
import {
  UseRequestConfig,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../shared_imports';

import { ROUTES } from '../../common/routes';
import { Alert } from '../../server/types';
import { Result, asOk, asErr } from './result_type';

export interface RequestData<T> {
  isLoading: boolean;
  data: Option<T>;
  sendRequest?: any;
}

interface RequestStatus<T, E> {
  isLoading: boolean;
  error?: E;
  data?: T;
  sendRequest?: any;
}

export interface LoadAlertsError {
  status: number;
}
export type LoadAlertsErrorResponse = LoadAlertsError | LoadAlertsError[];

export function hasReceivedAErrorCode(
  errorOrErrors: any
): errorOrErrors is LoadAlertsErrorResponse {
  const errors = Array.isArray(errorOrErrors) ? errorOrErrors : [errorOrErrors];
  const firstError = errors.find((error: any) => {
    if (error) {
      return [403, 404].includes(error.status);
    }

    return false;
  });

  if (firstError) {
    return true;
  }
  return false;
}

function wrapInResult<T, E>(status: RequestStatus<T, E>): Result<RequestData<T>, E> {
  return hasReceivedAErrorCode(status.error)
    ? asErr(status.error)
    : asOk({
        ...status,
        data: fromNullable(status.data),
      });
}

export interface AlertResponse extends Alert {
  id: string;
}
export interface LoadAlertsResponse {
  page: number;
  perPage: number;
  total: number;
  data: AlertResponse[];
}

export interface AlertingApi {
  loadAlerts: (
    pollIntervalMs: number
  ) => Result<RequestData<LoadAlertsResponse>, LoadAlertsErrorResponse>;
}

const basePath = chrome.addBasePath(ROUTES.API_ROOT);

export function getApiUsingHttpClient(httpClient: ng.IHttpService): AlertingApi {
  // const sendRequest = (config: SendRequestConfig): Promise<Partial<SendRequestResponse>> =>
  //   _sendRequest(httpClient, config);
  const useRequest = (config: UseRequestConfig) => _useRequest(httpClient, config);

  return {
    loadAlerts(
      pollIntervalMs: number
    ): Result<RequestData<LoadAlertsResponse>, LoadAlertsErrorResponse> {
      return wrapInResult<LoadAlertsResponse, LoadAlertsErrorResponse>(
        useRequest({
          path: `${basePath}/_find`,
          method: 'get',
          pollIntervalMs,
          deserializer: (response: { data?: any[]; error?: any }) => {
            return response;
          },
        })
      );
    },
  };
}
