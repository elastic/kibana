/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Option, fromNullable } from 'fp-ts/lib/Option';
import { HttpServiceBase } from 'kibana/public';
import { useRequestNp } from '../../../../public/shared_imports';
import { BASE_API_PATH } from '../constants';

import { ActionType } from '../../../../../actions/server/types';
import { Result, asOk, asErr } from './result_type';

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

function wrapInResult<T, E>(status: any): Result<RequestData<T>, E> {
  return hasReceivedAErrorCode(status.error)
    ? asErr(status.error)
    : asOk({
        ...status,
        data: fromNullable(status.data),
      });
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
  loadActionTypes: (
    pollIntervalMs: number
  ) => Result<RequestData<LoadActionTypesResponse>, LoadActionTypesErrorResponse>;
}

export function loadActionTypes(
  http: HttpServiceBase,
  pollIntervalMs?: number
): Result<RequestData<LoadActionTypesResponse>, LoadActionTypesErrorResponse> {
  return wrapInResult<LoadActionTypesResponse, LoadActionTypesErrorResponse>(
    useRequestNp(http, {
      path: `${BASE_API_PATH}/types`,
      method: 'get',
      pollIntervalMs,
      deserializer: (response: { data?: any[]; error?: any }) => {
        return response;
      },
    })
  );
}
