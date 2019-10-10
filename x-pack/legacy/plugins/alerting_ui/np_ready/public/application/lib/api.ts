/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Option } from 'fp-ts/lib/Option';
import { HttpServiceBase } from 'kibana/public';
import { useRequestNp } from '../../../../public/shared_imports';
import { BASE_API_PATH } from '../constants';

import { ActionType } from '../../../../../actions/server/types';

export interface RequestData<T> {
  isLoading: boolean;
  data: Option<T>;
  sendRequest?: any;
}

export interface RequestStatus<T, E> {
  isLoading: boolean;
  error?: E;
  data?: T;
  sendRequest?: any;
}

export interface LoadActionTypesResponse {
  data: ActionTypesResponse[];
}

export interface LoadActionTypesError {
  status: number;
}
export type LoadActionTypesErrorResponse = LoadActionTypesError | LoadActionTypesError[];

export function hasReceivedAErrorCode(
  errorOrErrors: any
): errorOrErrors is LoadActionTypesErrorResponse {
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

export interface ActionTypesResponse extends ActionType {
  id: string;
  name: string;
}
export interface LoadActionTypese {
  page: number;
  perPage: number;
  total: number;
  data: ActionTypesResponse[];
}

export interface ActionTypesApi {
  loadActionTypes: (pollIntervalMs: number) => RequestData<LoadActionTypesResponse>;
}

export function loadActionTypes(http: HttpServiceBase, pollIntervalMs?: number) {
  return useRequestNp(http, {
    path: `${BASE_API_PATH}/types`,
    method: 'get',
    pollIntervalMs,
    deserializer: (response: { data?: any[]; error?: any }) => {
      return response;
    },
  });
}
