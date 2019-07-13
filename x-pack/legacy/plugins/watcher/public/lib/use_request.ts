/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SendRequest,
  SendRequestResponse,
  UseRequest,
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '../shared_imports';
import { getHttpClient } from './api';

export const sendRequest = (config: SendRequest): Promise<Partial<SendRequestResponse>> => {
  return _sendRequest(getHttpClient(), config);
};

export const useRequest = (config: UseRequest) => {
  return _useRequest(getHttpClient(), config);
};
