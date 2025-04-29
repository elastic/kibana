/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosResponse, ResponseType } from 'axios';
import type { IncomingMessage } from 'http';
import { OpenAiProviderType } from '../../../../common/openai/constants';
import type { Config } from '../../../../common/openai/types';
import {
  sanitizeRequest as openAiSanitizeRequest,
  getRequestWithStreamOption as openAiGetRequestWithStreamOption,
} from './openai_utils';
import {
  sanitizeRequest as azureAiSanitizeRequest,
  getRequestWithStreamOption as azureAiGetRequestWithStreamOption,
} from './azure_openai_utils';
import {
  sanitizeRequest as otherOpenAiSanitizeRequest,
  getRequestWithStreamOption as otherOpenAiGetRequestWithStreamOption,
} from './other_openai_utils';
import fs from 'fs';
import https from 'https';

export const sanitizeRequest = (
  provider: string,
  url: string,
  body: string,
  defaultModel?: string
): string => {
  switch (provider) {
    case OpenAiProviderType.OpenAi:
      return openAiSanitizeRequest(url, body, defaultModel!);
    case OpenAiProviderType.AzureAi:
      return azureAiSanitizeRequest(url, body);
    case OpenAiProviderType.Other:
      return otherOpenAiSanitizeRequest(body);
    default:
      return body;
  }
};

export function getRequestWithStreamOption(
  provider: OpenAiProviderType.OpenAi,
  url: string,
  body: string,
  stream: boolean,
  defaultModel: string
): string;

export function getRequestWithStreamOption(
  provider: OpenAiProviderType.AzureAi | OpenAiProviderType.Other,
  url: string,
  body: string,
  stream: boolean
): string;

export function getRequestWithStreamOption(
  provider: OpenAiProviderType,
  url: string,
  body: string,
  stream: boolean,
  defaultModel?: string
): string;

export function getRequestWithStreamOption(
  provider: string,
  url: string,
  body: string,
  stream: boolean,
  defaultModel?: string
): string {
  switch (provider) {
    case OpenAiProviderType.OpenAi:
      return openAiGetRequestWithStreamOption(url, body, stream, defaultModel!);
    case OpenAiProviderType.AzureAi:
      return azureAiGetRequestWithStreamOption(url, body, stream);
    case OpenAiProviderType.Other:
      return otherOpenAiGetRequestWithStreamOption(body, stream, defaultModel);
    default:
      return body;
  }
}

export const getAxiosOptions = (
  provider: string,
  apiKey: string,
  stream: boolean,
  config?: Config
): { headers: Record<string, string>; httpsAgent?: https.Agent; responseType?: ResponseType } => {
  const responseType = stream ? { responseType: 'stream' as ResponseType } : {};

  switch (provider) {
    case OpenAiProviderType.OpenAi:
      return {
        headers: { Authorization: `Bearer ${apiKey}`, ['content-type']: 'application/json' },
        ...responseType,
      };
    case OpenAiProviderType.AzureAi:
      return {
        headers: { ['api-key']: apiKey, ['content-type']: 'application/json' },
        ...responseType,
      };
    case OpenAiProviderType.Other:
      if (
        config &&
        (config.certificateFile ||
          config.certificateData ||
          config.privateKeyFile ||
          config.privateKeyData)
      ) {
        if (!config.certificateFile && !config.certificateData) {
          throw new Error('Either certificate file or certificate data must be provided for PKI');
        }
        if (!config.privateKeyFile && !config.privateKeyData) {
          throw new Error('Either private key file or private key data must be provided for PKI');
        }

        let cert: string | Buffer;
        let key: string | Buffer;

        if (config.certificateFile) {
          cert = fs.readFileSync(
            Array.isArray(config.certificateFile)
              ? config.certificateFile[0]
              : config.certificateFile
          );
        } else {
          cert = config.certificateData!;
        }

        if (config.privateKeyFile) {
          key = fs.readFileSync(
            Array.isArray(config.privateKeyFile) ? config.privateKeyFile[0] : config.privateKeyFile
          );
        } else {
          key = config.privateKeyData!;
        }

        if (!cert.toString().includes('-----BEGIN CERTIFICATE-----')) {
          throw new Error('Invalid certificate format: Must be PEM-encoded');
        }
        if (!key.toString().includes('-----BEGIN PRIVATE KEY-----')) {
          throw new Error('Invalid private key format: Must be PEM-encoded');
        }

        const httpsAgent = new https.Agent({
          cert,
          key,
          rejectUnauthorized: config.verificationMode === 'none',
          checkServerIdentity:
            config.verificationMode === 'certificate' || config.verificationMode === 'none'
              ? () => undefined
              : undefined,
        });

        return {
          headers: { ['content-type']: 'application/json', Accept: 'application/json' },
          httpsAgent,
          ...responseType,
        };
      }
      return {
        headers: { Authorization: `Bearer ${apiKey}`, ['content-type']: 'application/json' },
        ...responseType,
      };
    default:
      return { headers: {} };
  }
};

export const pipeStreamingResponse = (response: AxiosResponse<IncomingMessage>) => {
  // Streaming responses are compressed by the Hapi router by default
  // Set content-type to something that's not recognized by Hapi in order to circumvent this
  response.data.headers = {
    ['Content-Type']: 'dont-compress-this',
  };
  return response.data;
};

export const getAzureApiVersionParameter = (url: string): string | undefined => {
  const urlSearchParams = new URLSearchParams(new URL(url).search);
  return urlSearchParams.get('api-version') ?? undefined;
};

export const validatePKICertificates = (
  certificateFile?: string | string[],
  certificateData?: string,
  privateKeyFile?: string | string[],
  privateKeyData?: string
): boolean => {
  try {
    // Check file paths if provided
    if (certificateFile) {
      const certPath = Array.isArray(certificateFile) ? certificateFile[0] : certificateFile;
      if (!fs.existsSync(certPath)) {
        return false;
      }
      fs.accessSync(certPath, fs.constants.R_OK);
    }
    if (privateKeyFile) {
      const keyPath = Array.isArray(privateKeyFile) ? privateKeyFile[0] : privateKeyFile;
      if (!fs.existsSync(keyPath)) {
        return false;
      }
      fs.accessSync(keyPath, fs.constants.R_OK);
    }

    // Check PEM format for data if provided
    if (certificateData && !certificateData.includes('-----BEGIN CERTIFICATE-----')) {
      return false;
    }
    if (privateKeyData && !privateKeyData.includes('-----BEGIN PRIVATE KEY-----')) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};