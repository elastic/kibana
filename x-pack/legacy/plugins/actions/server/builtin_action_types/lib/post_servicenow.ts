/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosResponse } from 'axios';
import { Services } from '../../types';

interface PostServiceNowOptions {
  apiUrl: string;
  data: any;
  headers: Record<string, string>;
  services: Services;
}

// post an event to pagerduty
export async function postServiceNow(options: PostServiceNowOptions): Promise<AxiosResponse> {
  const { apiUrl, data, headers } = options;
  const axiosOptions = {
    headers,
    validateStatus: () => true,
  };

  return axios.post(apiUrl, data, axiosOptions);
}
