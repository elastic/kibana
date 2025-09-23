/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionConnector } from '@kbn/actions-plugin/server';
import { FederatedConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { AxiosError } from 'axios';
import axios from 'axios';
import https from 'https';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import type { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type { RenderParameterTemplates } from '@kbn/actions-plugin/server/types';
import type {
  OAuthGoogleDriveConfig,
  OAuthGoogleDriveSecrets,
  OAuthGoogleDriveGetContentActionParams,
  OAuthGoogleDriveGetContentActionResponse,
  OAuthGoogleDriveQueryActionParams,
  OAuthGoogleDriveQueryActionResponse,
  OAuthGoogleDriveSecurityConnectorType,
} from '../../../common/oauth_google_drive/everything';
import {
  SUB_ACTION,
  OAuthGoogleDriveQueryActionParamsSchema,
  OAuthGoogleDriveGetContentActionParamsSchema,
  OAUTH_GOOGLE_DRIVE_CONNECTOR_ID,
  OAUTH_GOOGLE_DRIVE_TITLE,
  OAuthGoogleDriveConfigSchema,
  OAuthGoogleDriveSecretsSchema,
  CredentialStorage,
} from '../../../common/oauth_google_drive/everything';

const storage = new CredentialStorage();

export class OAuthGoogleDriveConnector extends SubActionConnector<
  OAuthGoogleDriveConfig,
  OAuthGoogleDriveSecrets
> {
  constructor(params: ServiceParams<OAuthGoogleDriveConfig, OAuthGoogleDriveSecrets>) {
    super(params);

    this.registerSubActions();
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (!error.response?.status) {
      return 'Unknown API Error';
    }
    if (error.response.status === 401) {
      return 'Unauthorized API Error';
    }

    return `API Error: ${error.response?.status} - ${error.response?.statusText}`;
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.QUERY,
      method: 'runApi',
      schema: OAuthGoogleDriveQueryActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.DOWNLOAD,
      method: 'runDownload',
      schema: OAuthGoogleDriveGetContentActionParamsSchema,
    });
  }

  private async fetchAccessToken(): Promise<string | null> {
    const stored_access_token = storage.get('oauth_google_drive_credential');

    if (stored_access_token === null || stored_access_token === '') {
      console.log('EXCHANGING');
      const exchanged_access_token = await this.exchangeAccessToken();

      return exchanged_access_token;
    }

    return stored_access_token;
  }

  private async exchangeAccessToken(): Promise<string | null> {
    const oauthRequestId = storage.get('oauth_request_id');

    if (oauthRequestId === null) {
      return '';
    }

    try {
      const response = await axios.get(
        `https://localhost:8052/oauth/fetch_request_secrets?request_id=${oauthRequestId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // TODO: remove this not secure
          }),
        }
      );

      const access_token = response.data.access_token;

      storage.set('oauth_google_drive_credential', access_token);
      return access_token;
    } catch (error) {
      console.log('ERROR', error);
      throw error;
    }
  }

  public async runDownload(
    { fileId }: OAuthGoogleDriveGetContentActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<OAuthGoogleDriveGetContentActionResponse> {
    try {
      console.log('Attempting to download the content');
      const access_token = await this.fetchAccessToken();

      const config = {
        headers: { Authorization: `Bearer ${access_token}` },
      };

      console.log('Downloading the file');
      console.log(`https://www.googleapis.com/drive/v3/files/${fileId}/download`);

      const downloadResponse = await axios.post(
        `https://www.googleapis.com/drive/v3/files/${fileId}/download`,
        {},
        config
      );
      console.log(downloadResponse);

      console.log('Actually downloading it');
      const fileContentResponse = await axios.get(downloadResponse.data.response.downloadUri, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const data = fileContentResponse.data;
      console.log('Data is:');
      console.log(data);
      console.log('Subextracting it');
      const extractedFileContentResponse = await axios.put(
        'http://localhost:8090/extract_text/',
        data,
        {
          headers: { 'Content-Type': 'application/octet-stream' },
        }
      );

      console.log(`Subextracted:`);
      console.log(extractedFileContentResponse);

      return {
        content: extractedFileContentResponse.data.extracted_text,
      };
    } catch (error) {
      console.log('ERROR');
      console.log(error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 403 || error.response.status === 401) {
          console.log('ERROR RESPONSE' + error.response.status);
          console.log('IT WAS 403 or 401');
          // try connecting and tell about it
          const scope = [
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.readonly',
            'https://www.googleapis.com/auth/admin.directory.user.readonly',
          ];

          const response = await axios.post(
            `https://localhost:8052/oauth/start/google`,
            {
              service_type: 'gdrive',
              scope,
              cloud_id: 'local_kibana',
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
              httpsAgent: new https.Agent({
                rejectUnauthorized: false, // Accept self-signed certificates
              }),
            }
          );

          const requestId = response.data.request_id;
          const authUrl = response.data.auth_url;

          console.log(`AUTH URL${authUrl}`);

          storage.set('oauth_request_id', requestId);

          return {
            data: [],
            authLink: authUrl,
          };
        }
      } else {
        console.log('IT WAS SOMETHING ELSE'); // lol
        throw error;
      }
    }
  }

  public async runApi(
    { query }: OAuthGoogleDriveQueryActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<OAuthGoogleDriveQueryActionResponse> {
    try {
      console.log('RUNNING API');
      const access_token = await this.fetchAccessToken();

      const config = {
        headers: { Authorization: `Bearer ${access_token}` },
      };

      const response = await axios.get(`https://www.googleapis.com/drive/v3/files`, config);

      console.log('RESULT');
      console.log(response.data);

      return {
        data: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 403 || error.response.status === 401) {
          console.log('ERROR RESPONSE ', error.response.data.error);
          console.log('IT WAS 403 or 401');
          // try connecting and tell about it
          const scope = [
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly',
            'https://www.googleapis.com/auth/admin.directory.group.readonly',
            'https://www.googleapis.com/auth/admin.directory.user.readonly',
          ];

          const response = await axios.post(
            `https://localhost:8052/oauth/start/google`,
            {
              service_type: 'gdrive',
              scope,
              cloud_id: 'local_kibana',
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
              httpsAgent: new https.Agent({
                rejectUnauthorized: false, // Accept self-signed certificates
              }),
            }
          );

          const requestId = response.data.request_id;
          const authUrl = response.data.auth_url;

          console.log(`AUTH URL 1${authUrl}`);

          storage.set('oauth_request_id', requestId);

          return {
            data: [],
            authLink: authUrl,
          };
        }
      } else {
        console.log('IT WAS SOMETHING ELSE');
        throw error;
      }
    }
  }
}

export const renderParameterTemplates: RenderParameterTemplates<ExecutorParams> = (
  logger,
  params,
  variables
) => {
  return {
    ...params,
    subActionParams: {
      ...params.subActionParams,
      body: renderMustacheString(logger, params.subActionParams.body as string, variables, 'json'),
    },
  };
};

export function getConnectorType(): OAuthGoogleDriveSecurityConnectorType {
  return {
    id: OAUTH_GOOGLE_DRIVE_CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: OAUTH_GOOGLE_DRIVE_TITLE,
    getService: (params) => new OAuthGoogleDriveConnector(params),
    supportedFeatureIds: [FederatedConnectorFeatureId],
    schema: {
      config: OAuthGoogleDriveConfigSchema,
      secrets: OAuthGoogleDriveSecretsSchema,
    },
    renderParameterTemplates,
  };
}
