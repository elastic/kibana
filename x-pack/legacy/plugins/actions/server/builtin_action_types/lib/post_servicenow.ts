/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosResponse } from 'axios';
import { Services } from '../../types';
import { ParamsType, SecretsType } from '../servicenow';

interface PostServiceNowOptions {
  apiUrl: string;
  data: ParamsType;
  headers: Record<string, string>;
  services?: Services;
  secrets: SecretsType;
}

// post an event to pagerduty
export async function postServiceNow(options: PostServiceNowOptions): Promise<AxiosResponse> {
  const { apiUrl, data, headers, secrets } = options;
  const axiosOptions = {
    headers,
    validateStatus: () => true,
    auth: secrets,
  };
  return axios.post(`${apiUrl}/api/now/v1/table/incident`, data, axiosOptions);
}
