/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance, AxiosResponse } from 'axios';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { Logger } from '@kbn/core/server';
import { addTimeZoneToDate, getErrorMessage } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { ConnectorTokenClientContract } from '@kbn/actions-plugin/server/types';
import { getOAuthJwtAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_jwt_access_token';
import { getBasicAuthHeader } from '@kbn/actions-plugin/server';
import type {
  ServiceNowSecretConfigurationType,
  ServiceNowPublicConfigurationType,
} from '@kbn/connector-schemas/servicenow';
import type {
  ExternalServiceCredentials,
  Incident,
  PartialIncident,
  ResponseError,
  ErrorMessageFormat,
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
/**
 * Extracts error information from ServiceNow API errors.
 *
 * Handles 3 formats:
 * 1. Table API: error.response.data = { error: { message?: string, detail?: string }, status?: string }
 * 2. OAuth: error.message is JSON like {"error": "invalid_grant", "error_description"?: "User not found"}
 * 3. Plain message like Incident id is empty
 */
const createErrorMessage = (error: ResponseError): ErrorMessageFormat => {
  // 1. Standard ServiceNow Table API error (error.response.data exists)
  const data = error.response?.data;

  if (data) {
    const snErrorMessage = data.error?.message;
    const snErrorDetail = data.error?.detail;

    const reason = snErrorMessage
      ? snErrorDetail
        ? `${snErrorMessage}: ${snErrorDetail}`
        : snErrorMessage
      : 'unknown: no error in error response';

    return {
      error: error.message,
      reason,
    };
  }

  // 2. OAuth error (error.message is JSON)
  // Example: {"error":"invalid_grant","error_description":"User not found"}
  if (error.message) {
    try {
      const parsed = JSON.parse(error.message);
      if (typeof parsed?.error === 'string') {
        const reason = parsed.error_description || '';
        return { error: parsed.error, reason };
      }
    } catch {
      // JSON parsing failed - not an OAuth error, use error.message as-is
    }

    // Plain error
    return { error: error.message, reason: '' };
  }

  return { error: '', reason: '' };
};

export const addServiceMessageToError = (error: ResponseError, message: string): AxiosError => {
  const { error: errorPart, reason } = createErrorMessage(error);

  const parts = [`${message}.`, 'Error:', errorPart];
  if (reason) parts.push('Reason:', reason);

  error.message = getErrorMessage(i18n.SERVICENOW, parts.join(' '));
  return error;
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
