/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

import type {
  UseRequestConfig,
  UseRequestResponse,
  SendRequestConfig,
  SendRequestResponse,
  Error,
} from '../shared_imports';
import { sendRequest as _sendRequest, useRequest as _useRequest } from '../shared_imports';

export type UseRequestHook = <T = any, E = Error>(
  config: UseRequestConfig
) => UseRequestResponse<T, E>;
export type SendRequestHook = <T = any>(
  config: SendRequestConfig
) => Promise<SendRequestResponse<T>>;

export const getUseRequest =
  (httpClient: HttpSetup): UseRequestHook =>
  <T = any, E = Error>(config: UseRequestConfig) => {
    return _useRequest<T, E>(httpClient, config);
  };

export const getSendRequest =
  (httpClient: HttpSetup): SendRequestHook =>
  <T = any>(config: SendRequestConfig) => {
    return _sendRequest<T>(httpClient, config);
  };
