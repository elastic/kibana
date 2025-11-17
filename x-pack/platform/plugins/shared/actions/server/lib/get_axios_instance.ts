/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import type { ActionInfo } from './action_executor';
import type { AuthTypeRegistry } from '../auth_types';
import { getCustomAgents } from './get_custom_agents';
import type { ActionsConfigurationUtilities } from '../actions_config';

export type ConnectorInfo = Omit<ActionInfo, 'rawAction'>;

interface GetAxiosInstanceOpts {
  authTypeRegistry: AuthTypeRegistry;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

type ValidatedSecrets = Record<string, unknown>;

export type GetAxiosInstanceWithAuthFn = (secrets: ValidatedSecrets) => Promise<AxiosInstance>;
export const getAxiosInstanceWithAuth = ({
  authTypeRegistry,
  configurationUtilities,
  logger,
}: GetAxiosInstanceOpts): GetAxiosInstanceWithAuthFn => {
  return async (secrets: ValidatedSecrets) => {
    try {
      const authTypeId = (secrets as { authType?: string }).authType || 'none';

      // return empty axios instance if no auth
      if (authTypeId === 'none') {
        return axios.create();
      }

      // throws if auth type is not found
      const authType = authTypeRegistry.get(authTypeId);

      const { maxContentLength, timeout: settingsTimeout } =
        configurationUtilities.getResponseSettings();

      const axiosInstance = axios.create({
        // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
        proxy: false,
        maxContentLength,
        // should we allow a way for a connector type to specify a timeout override?
        timeout: settingsTimeout,
      });

      // create a request interceptor to inject custom http/https agents based on the URL
      axiosInstance.interceptors.request.use((config) => {
        if (config.url) {
          const { httpAgent, httpsAgent } = getCustomAgents(
            configurationUtilities,
            logger,
            config.url,
            // sslOverrides??
            {}
          );

          config.httpAgent = httpAgent;
          config.httpsAgent = httpsAgent;
        }
        return config;
      });
      return authType.configure(axiosInstance, secrets);
    } catch (err) {
      // log something?
      throw err;
    }
  };
};
