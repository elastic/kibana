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
import { RawAlert } from '../../server/types';

export interface RequestStatus<T> {
  isLoading: boolean;
  error: Option<any>;
  data: Option<T>;
  sendRequest?: any;
}

interface UnsafeRequestStatus<T> {
  isLoading: boolean;
  error?: any;
  data?: T;
  sendRequest?: any;
}

function makeRequestNullSafe<T>(status: UnsafeRequestStatus<T>): RequestStatus<T> {
  return {
    ...status,
    data: fromNullable(status.data),
    error: fromNullable(status.error),
  };
}

export interface LoadAlertsResponse {
  page: number;
  perPage: number;
  total: number;
  data: RawAlert[];
}

export interface AlertingApi {
  loadAlerts: (pollIntervalMs: number) => RequestStatus<LoadAlertsResponse>;
}

const basePath = chrome.addBasePath(ROUTES.API_ROOT);

export function getApiUsingHttpClient(httpClient: ng.IHttpService): AlertingApi {
  // const sendRequest = (config: SendRequestConfig): Promise<Partial<SendRequestResponse>> =>
  //   _sendRequest(httpClient, config);
  const useRequest = (config: UseRequestConfig) => _useRequest(httpClient, config);

  return {
    loadAlerts(pollIntervalMs: number): RequestStatus<LoadAlertsResponse> {
      return makeRequestNullSafe(
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
