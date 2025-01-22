/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SendRequestConfig,
  UseRequestConfig,
  Error as CustomError,
} from '../../../shared_imports';
import { sendRequest as _sendRequest, useRequest as _useRequest } from '../../../shared_imports';

import { httpService } from '.';

export const sendRequest = (config: SendRequestConfig) => {
  return _sendRequest<any, CustomError>(httpService.httpClient, config);
};

export const useRequest = <D = any>(config: UseRequestConfig) => {
  return _useRequest<D, CustomError>(httpService.httpClient, config);
};
