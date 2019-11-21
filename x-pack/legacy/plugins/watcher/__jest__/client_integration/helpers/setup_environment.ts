/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { init as initHttpRequests } from './http_requests';
import { setHttpClient, setSavedObjectsClient } from '../../../public/lib/api';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

const mockSavedObjectsClient = () => {
  return {
    find: (_params?: any) => {},
  };
};

export const setupEnvironment = () => {
  const { server, httpRequestsMockHelpers } = initHttpRequests();

  // @ts-ignore
  setHttpClient(mockHttpClient);

  setSavedObjectsClient(mockSavedObjectsClient());

  return {
    server,
    httpRequestsMockHelpers,
  };
};
