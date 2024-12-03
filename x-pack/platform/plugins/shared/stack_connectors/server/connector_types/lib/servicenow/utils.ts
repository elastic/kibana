/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError, AxiosHeaders, AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '@kbn/core/server';
import { addTimeZoneToDate, getErrorMessage } from '@kbn/actions-plugin/server/lib/axios_utils';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { ConnectorTokenClientContract } from '@kbn/actions-plugin/server/types';
import { getOAuthJwtAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_jwt_access_token';
import { getBasicAuthHeader } from '@kbn/actions-plugin/server';
import {
  ExternalServiceCredentials,
  Incident,
  PartialIncident,
  ResponseError,
  ServiceNowError,
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
} from './types';
import { FIELD_PREFIX } from './config';
import * as i18n from './translations';

export const prepareIncident = (
  useOldApi: boolean,
  incident: PartialIncident
): Record<string, unknown> => {
  const { additional_fields: additionalFields, ...restIncidentFields } = incident;

  if (useOldApi) {
    return restIncidentFields;
  }

  const baseFields = Object.entries(restIncidentFields).reduce<Partial<Incident>>(
    (acc, [key, value]) => ({ ...acc, [`${FIELD_PREFIX}${key}`]: value }),
    {}
  );

  return { ...additionalFields, ...baseFields };
};

const createErrorMessage = (errorResponse?: ServiceNowError): string => {
  if (errorResponse == null) {
    return 'unknown: errorResponse was null';
  }

  const { error } = errorResponse;
  return error != null
    ? `${error?.message}: ${error?.detail}`
    : 'unknown: no error in error response';
};

export const createServiceError = (error: ResponseError, message: string): AxiosError => {
  const serviceError = new AxiosError(
    getErrorMessage(
      i18n.SERVICENOW,
      `${message}. Error: ${error.message} Reason: ${createErrorMessage(error.response?.data)}`
    )
  );

  serviceError.code = error.code;
  serviceError.config = error.config;
  serviceError.request = error.request;
  serviceError.response = error.response;

  return serviceError;
};

export const getPushedDate = (timestamp?: string) => {
  if (timestamp != null) {
    return new Date(addTimeZoneToDate(timestamp)).toISOString();
  }

  return new Date().toISOString();
};

export const throwIfSubActionIsNotSupported = ({
  api,
  subAction,
  supportedSubActions,
  logger,
}: {
  api: Record<string, unknown>;
  subAction: string;
  supportedSubActions: string[];
  logger: Logger;
}) => {
  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const throwIfAdditionalFieldsNotSupported = (
  useOldApi: boolean,
  incident: PartialIncident
) => {
  if (useOldApi && incident.additional_fields) {
    throw new AxiosError(
      'ServiceNow additional fields are not supported for deprecated connectors.',
      '400'
    );
  }
};

export interface GetAxiosInstanceOpts {
  connectorId: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  credentials: ExternalServiceCredentials;
  snServiceUrl: string;
  connectorTokenClient: ConnectorTokenClientContract;
}

export const getAxiosInstance = ({
  connectorId,
  logger,
  configurationUtilities,
  credentials,
  snServiceUrl,
  connectorTokenClient,
}: GetAxiosInstanceOpts): AxiosInstance => {
  const { config, secrets } = credentials;
  const { isOAuth } = config as ServiceNowPublicConfigurationType;
  const { username, password } = secrets as ServiceNowSecretConfigurationType;

  let axiosInstance;

  if (!isOAuth && username && password) {
    axiosInstance = axios.create({
      headers: getBasicAuthHeader({ username, password }),
    });
  } else {
    axiosInstance = axios.create();
    axiosInstance.interceptors.request.use(
      async (axiosConfig) => {
        const accessToken = await getOAuthJwtAccessToken({
          connectorId,
          logger,
          configurationUtilities,
          credentials: {
            config: {
              clientId: config.clientId as string,
              jwtKeyId: config.jwtKeyId as string,
              userIdentifierValue: config.userIdentifierValue as string,
            },
            secrets: {
              clientSecret: secrets.clientSecret as string,
              privateKey: secrets.privateKey as string,
              privateKeyPassword: secrets.privateKeyPassword
                ? (secrets.privateKeyPassword as string)
                : null,
            },
          },
          tokenUrl: `${snServiceUrl}/oauth_token.do`,
          connectorTokenClient,
        });
        if (!accessToken) {
          throw new Error(`Unable to retrieve access token for connectorId: ${connectorId}`);
        }
        axiosConfig.headers = new AxiosHeaders({
          ...axiosConfig.headers,
          Authorization: accessToken,
        });
        return axiosConfig;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const statusCode = error?.response?.status;

        // Look for 4xx errors that indicate something is wrong with the request
        // We don't know for sure that it is an access token issue but remove saved
        // token just to be sure
        if (statusCode >= 400 && statusCode < 500) {
          await connectorTokenClient.deleteConnectorTokens({ connectorId });
        }
        return Promise.reject(error);
      }
    );
  }

  return axiosInstance;
};
