/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError, AxiosResponse } from 'axios';
import type { ConnectorTokenClientContract } from '../types';

interface GetDeleteTokenAxiosInterceptorParams {
  connectorTokenClient: ConnectorTokenClientContract;
  connectorId: string;
}
export const getDeleteTokenAxiosInterceptor = ({
  connectorTokenClient,
  connectorId,
}: GetDeleteTokenAxiosInterceptorParams) => {
  return {
    onFulfilled: async (response: AxiosResponse) => {
      // Look for 4xx errors that indicate something is wrong with the request
      // We don't know for sure that it is an access token issue but remove saved
      // token just to be sure
      if (response.status >= 400 && response.status < 500) {
        await connectorTokenClient.deleteConnectorTokens({ connectorId });
      }
      return response;
    },
    onRejected: async (error: AxiosError) => {
      const statusCode = error.response?.status;

      // Look for 4xx errors that indicate something is wrong with the request
      // We don't know for sure that it is an access token issue but remove saved
      // token just to be sure
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        await connectorTokenClient.deleteConnectorTokens({ connectorId });
      }
      return Promise.reject(error);
    },
  };
};
