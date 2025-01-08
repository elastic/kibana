/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';
import { Logger } from '@kbn/core/server';
import { ConnectorUsageCollector, Services } from '@kbn/actions-plugin/server/types';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';

interface PostPagerdutyOptions {
  apiUrl: string;
  data: unknown;
  headers: Record<string, string>;
  services: Services;
}

// post an event to pagerduty
export async function postPagerduty(
  options: PostPagerdutyOptions,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  connectorUsageCollector: ConnectorUsageCollector
): Promise<AxiosResponse> {
  const { apiUrl, data, headers } = options;
  const axiosInstance = axios.create();

  return await request({
    axios: axiosInstance,
    url: apiUrl,
    method: 'post',
    logger,
    data,
    headers,
    configurationUtilities,
    validateStatus: () => true,
    connectorUsageCollector,
  });
}
