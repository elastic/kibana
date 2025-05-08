/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosResponse, ResponseType } from 'axios';
import type { IncomingMessage } from 'http';
import fs from 'fs';
import https from 'https';
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
import type { Logger } from '@kbn/logging';

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
  config?: Config,
  logger?: Logger
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
        let cert, key, ca;
        try {
          if (config.certificateFile) {
            cert = fs.readFileSync(
              Array.isArray(config.certificateFile)
                ? config.certificateFile[0]
                : config.certificateFile,
              'utf8'
            );
          } else {
            cert = config.certificateData!;
          }
        } catch (e) {
          logger?.error(`Failed to read client certificate: ${e.message}`);
          throw new Error(`Failed to read client certificate: ${e.message}`);
        }
        try {
          if (config.privateKeyFile) {
            key = fs.readFileSync(
              Array.isArray(config.privateKeyFile)
                ? config.privateKeyFile[0]
                : config.privateKeyFile,
              'utf8'
            );
          } else {
            key = config.privateKeyData!;
          }
        } catch (e) {
          logger?.error(`Failed to read private key: ${e.message}`);
          throw new Error(`Failed to read private key: ${e.message}`);
        }
        try {
          if (config.caFile) {
            ca = fs.readFileSync(
              Array.isArray(config.caFile) ? config.caFile[0] : config.caFile,
              'utf8'
            );
          } else if (config.caData) {
            ca = config.caData;
          }
        } catch (e) {
          logger?.error(`Failed to read CA certificate: ${e.message}`);
          throw new Error(`Failed to read CA certificate: ${e.message}`);
        }
        const httpsAgent = new https.Agent({
          cert,
          key,
          ...(ca ? { ca } : {}),
          rejectUnauthorized: config.verificationMode !== 'none',
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
  logger: Logger,
  certificateFile?: string | string[],
  certificateData?: string,
  privateKeyFile?: string | string[],
  privateKeyData?: string
): boolean => {
  try {
    // Check file paths if provided
    if (certificateFile) {
      logger.debug(`Validating certificate file: ${certificateFile}`);
      const certPath = Array.isArray(certificateFile) ? certificateFile[0] : certificateFile;
      if (!fs.existsSync(certPath)) {
        return false;
      }
      fs.accessSync(certPath, fs.constants.R_OK);
    }
    if (privateKeyFile) {
      logger.debug(`Validating private key file: ${privateKeyFile}`);
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
    logger.error(`Error validating PKI certificates: ${error.message}`);
    return false;
  }
};

export const getPKISSLOverrides = (
  logger: Logger,
  certificateFile?: string | string[],
  certificateData?: string,
  privateKeyFile?: string | string[],
  privateKeyData?: string,
  caFile?: string | string[],
  caData?: string,
  verificationMode?: 'full' | 'certificate' | 'none'
): Record<string, any> => {
  let cert: string;
  let key: string;
  let ca: string | undefined;

  if (certificateFile) {
    cert = fs.readFileSync(
      Array.isArray(certificateFile) ? certificateFile[0] : certificateFile,
      'utf8'
    );
  } else if (certificateData) {
    cert = formatPEMContent(certificateData, 'CERTIFICATE', logger);
  } else {
    throw new Error('No certificate file or data provided');
  }

  if (privateKeyFile) {
    key = fs.readFileSync(
      Array.isArray(privateKeyFile) ? privateKeyFile[0] : privateKeyFile,
      'utf8'
    );
  } else if (privateKeyData) {
    key = formatPEMContent(privateKeyData, 'PRIVATE KEY', logger);
  } else {
    throw new Error('No private key file or data provided');
  }

  if (caFile) {
    ca = fs.readFileSync(Array.isArray(caFile) ? caFile[0] : caFile, 'utf8');
  } else if (caData) {
    ca = formatPEMContent(caData, 'CERTIFICATE', logger);
  }

  return {
    cert,
    key,
    ca,
    rejectUnauthorized: verificationMode !== 'none',
    checkServerIdentity:
      verificationMode === 'certificate' || verificationMode === 'none'
        ? () => undefined
        : undefined,
  };
};

export function formatPEMContent(
  pemContent: string,
  type: 'CERTIFICATE' | 'PRIVATE KEY',
  logger: Logger
): string {
  if (!pemContent) return pemContent;

  // Normalize input by replacing all whitespace with a single space
  const normalizedContent = pemContent.replace(/\s+/g, ' ').trim();

  // Define header and footer
  const header = `-----BEGIN ${type}-----`;
  const footer = `-----END ${type}-----`;

  // Verify header and footer
  if (!normalizedContent.startsWith(header) || !normalizedContent.endsWith(footer)) {
    logger.debug(`Invalid PEM format for ${type}: Missing header or footer`);
    return pemContent;
  }

  // Extract base64 content between header and footer
  const base64Content = normalizedContent
    .slice(header.length, normalizedContent.length - footer.length)
    .trim();

  // Remove all whitespace from base64 content
  const cleanBase64 = base64Content.replace(/\s+/g, '');

  // Split into 64-character lines
  const formattedBase64 = cleanBase64.match(/.{1,64}/g)?.join('\n') || cleanBase64;

  // Assemble formatted PEM with newlines
  return `${header}\n${formattedBase64}\n${footer}`;
}