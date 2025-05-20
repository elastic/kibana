/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SSLSettings } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import type { Config } from '../../../../common/openai/types';

/**
 * Sanitizes the Other (OpenAI Compatible Service) request body to set stream to false
 * so users cannot specify a streaming response when the framework
 * is not prepared to handle streaming
 *
 * The stream parameter is accepted in the ChatCompletion
 * API and the Completion API only
 */
export const sanitizeRequest = (body: string): string => {
  return getRequestWithStreamOption(body, false);
};

/**
 * Intercepts the Other (OpenAI Compatible Service) request body to set the stream parameter
 *
 * The stream parameter is accepted in the ChatCompletion
 * API and the Completion API only
 */
export const getRequestWithStreamOption = (
  body: string,
  stream: boolean,
  defaultModel?: string
): string => {
  try {
    const jsonBody = JSON.parse(body);
    if (jsonBody) {
      jsonBody.stream = stream;
    }
    if (defaultModel && !jsonBody.model) {
      jsonBody.model = defaultModel;
    }
    return JSON.stringify(jsonBody);
  } catch (err) {
    // swallow the error
  }

  return body;
};

// PKI utils
interface SSLOverridesInput {
  logger: Logger;
  certificateData?: string;
  privateKeyData?: string;
  caData?: string;
  verificationMode?: 'full' | 'certificate' | 'none';
}
const validatePEMData = (
  data: string | undefined,
  type: 'CERTIFICATE' | 'PRIVATE KEY',
  description: string
): void => {
  if (data && !data.includes(`-----BEGIN ${type}-----`)) {
    throw new Error(
      `Invalid ${description} file format: The file must be a PEM-encoded certificate beginning with "-----BEGIN ${type}-----".`
    );
  }
};

const validatePKICertificates = ({
  certificateData,
  privateKeyData,
  caData,
  logger,
}: SSLOverridesInput): void => {
  try {
    if (certificateData) validatePEMData(certificateData, 'CERTIFICATE', 'Certificate data');
    if (privateKeyData) validatePEMData(privateKeyData, 'PRIVATE KEY', 'Private key data');
    if (caData) validatePEMData(caData, 'CERTIFICATE', 'CA certificate data');
  } catch (error) {
    logger.error(`Error validating PKI certificates: ${error.message}`);
    throw new Error(`Invalid or inaccessible PKI certificates: ${error.message}`);
  }
};

const loadBuffer = (data?: string, type?: 'CERTIFICATE' | 'PRIVATE KEY'): Buffer => {
  if (data) {
    return Buffer.from(formatPEMContent(data, type!));
  }
  throw new Error(`No ${type?.toLowerCase()} data provided`);
};
export const getPKISSLOverrides = ({
  logger,
  certificateData,
  privateKeyData,
  caData,
  verificationMode,
}: SSLOverridesInput): SSLSettings => {
  validatePKICertificates({
    logger,
    certificateData,
    privateKeyData,
    caData,
  });

  const cert = loadBuffer(certificateData, 'CERTIFICATE');
  const key = loadBuffer(privateKeyData, 'PRIVATE KEY');
  // ca can be undefined for certification mode "None"
  const ca = caData ? loadBuffer(caData, 'CERTIFICATE') : undefined;

  return { cert, key, ca, verificationMode };
};

function formatPEMContent(pemContent: string, type: 'CERTIFICATE' | 'PRIVATE KEY'): string {
  if (!pemContent) return pemContent;

  const header = `-----BEGIN ${type}-----`;
  const footer = `-----END ${type}-----`;

  const normalizedContent = pemContent.replace(/\s+/g, ' ').trim();

  if (!normalizedContent.startsWith(header) || !normalizedContent.endsWith(footer)) {
    return pemContent;
  }

  const base64Content = normalizedContent
    .slice(header.length, normalizedContent.length - footer.length)
    .replace(/\s+/g, '');

  const formattedBase64 = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;

  return `${header}\n${formattedBase64}\n${footer}`;
}

export const pkiErrorHandler = (error: AxiosError): string | undefined => {
  if (error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
    return `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`;
  }
  if (
    error.message.includes('ERR_TLS_CERT_ALTNAME_INVALID') ||
    error.message.includes('ERR_TLS_HANDSHAKE')
  ) {
    return `TLS handshake failed: ${error.message}. Verify server certificate hostname and CA configuration.`;
  }
};

export const pkiConfigValidator = (configObject: Config): void => {
  if (
    'caData' in configObject ||
    'certificateData' in configObject ||
    'privateKeyData' in configObject
  ) {
    if (!configObject.certificateData) {
      throw new Error('Certificate data must be provided for PKI');
    }
    if (!configObject.privateKeyData) {
      throw new Error('Private key data must be provided for PKI');
    }
    // Validate PEM format for raw data
    validatePEMData(configObject.certificateData, 'CERTIFICATE', 'Certificate data');
    validatePEMData(configObject.privateKeyData, 'PRIVATE KEY', 'Private key data');
    // CA is optional, but if provided, validate its format
    if (configObject.caData) {
      validatePEMData(configObject.caData, 'CERTIFICATE', 'CA certificate data');
    }
  } else {
    throw new Error('PKI configuration requires certificate and private key');
  }
};
