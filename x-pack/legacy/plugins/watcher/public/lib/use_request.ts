/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SendRequest,
  SendRequestResponse,
  UseRequest,
  createRequestService,
} from '../shared_imports';
import { getHttpClient } from './api';

export const sendRequest = (config: SendRequest): Promise<Partial<SendRequestResponse>> => {
  const { sendRequest: sendRequestFn } = createRequestService(getHttpClient());
  return sendRequestFn(config);
};

export const useRequest = (config: UseRequest) => {
  const { useRequest: useRequestFn } = createRequestService(getHttpClient());
  return useRequestFn(config);
};
