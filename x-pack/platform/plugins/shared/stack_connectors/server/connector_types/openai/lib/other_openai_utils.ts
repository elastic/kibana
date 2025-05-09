/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import fs from 'fs';
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
  certificateFile?: string | string[];
  certificateData?: string;
  privateKeyFile?: string | string[];
  privateKeyData?: string;
  caFile?: string | string[];
  caData?: string;
  verificationMode?: 'full' | 'certificate' | 'none';
}

const getFilePath = (file?: string | string[]) => (Array.isArray(file) ? file[0] : file);

const validateFile = (path: string, description: string) => {
  if (!fs.existsSync(path)) {
    throw new Error(`${description} not found: ${path}`);
  }
  fs.accessSync(path, fs.constants.R_OK);
};

const validateCertOrKey = (
  data: string | undefined,
  type: 'CERTIFICATE' | 'PRIVATE KEY',
  description: string
) => {
  if (data && !data.includes(`-----BEGIN ${type}-----`)) {
    throw new Error(`Invalid PEM format for ${description}: Missing BEGIN ${type} header`);
  }
};

const validatePKICertificates = ({
  certificateFile,
  certificateData,
  privateKeyFile,
  privateKeyData,
  caFile,
  caData,
  logger,
}: SSLOverridesInput): void => {
  try {
    if (certificateFile) validateFile(getFilePath(certificateFile), 'Certificate file');
    if (privateKeyFile) validateFile(getFilePath(privateKeyFile), 'Private key file');
    if (caFile) validateFile(getFilePath(caFile), 'CA file');

    if (certificateData) validateCertOrKey(certificateData, 'CERTIFICATE', 'Certificate data');
    if (privateKeyData) validateCertOrKey(privateKeyData, 'PRIVATE KEY', 'Private key data');
    if (caData) validateCertOrKey(caData, 'CERTIFICATE', 'CA certificate data');
  } catch (error) {
    logger.error(`Error validating PKI certificates: ${error.message}`);
    throw new Error(`Invalid or inaccessible PKI certificates: ${error.message}`);
  }
};

const loadBuffer = (
  file?: string | string[],
  data?: string,
  type?: 'CERTIFICATE' | 'PRIVATE KEY'
) => {
  if (file) {
    return Buffer.from(fs.readFileSync(getFilePath(file), 'utf8'));
  } else if (data) {
    return Buffer.from(formatPEMContent(data, type!));
  }
  throw new Error(`No ${type?.toLowerCase()} file or data provided`);
};
export const getPKISSLOverrides = ({
  logger,
  certificateFile,
  certificateData,
  privateKeyFile,
  privateKeyData,
  caFile,
  caData,
  verificationMode,
}: SSLOverridesInput): SSLSettings => {
  validatePKICertificates({
    logger,
    certificateFile,
    certificateData,
    privateKeyFile,
    privateKeyData,
  });

  const cert = loadBuffer(certificateFile, certificateData, 'CERTIFICATE');
  const key = loadBuffer(privateKeyFile, privateKeyData, 'PRIVATE KEY');
  const ca = caFile
    ? Buffer.from(fs.readFileSync(getFilePath(caFile), 'utf8'))
    : caData
    ? Buffer.from(formatPEMContent(caData, 'CERTIFICATE'))
    : undefined;

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
  if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`;
  }
  if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID' || error.code === 'ERR_TLS_HANDSHAKE') {
    return `TLS handshake failed: ${error.message}. Verify server certificate hostname and CA configuration.`;
  }
};

export const pkiConfigValidator = (configObject: Config): void => {
  // Ensure certificate pair is provided
  if (!configObject.certificateFile && !configObject.certificateData) {
    throw new Error('Either certificate file or certificate data must be provided for PKI');
  }
  if (!configObject.privateKeyFile && !configObject.privateKeyData) {
    throw new Error('Either private key file or private key data must be provided for PKI');
  }

  // Validate file extensions for file paths
  if (configObject.certificateFile) {
    const certFile = Array.isArray(configObject.certificateFile)
      ? configObject.certificateFile[0]
      : configObject.certificateFile;
    if (!certFile.endsWith('.pem')) {
      throw new Error('Certificate file must end with .pem');
    }
  }
  if (configObject.privateKeyFile) {
    const keyFile = Array.isArray(configObject.privateKeyFile)
      ? configObject.privateKeyFile[0]
      : configObject.privateKeyFile;
    if (!keyFile.endsWith('.pem')) {
      throw new Error('Private key file must end with .pem');
    }
  }

  // Validate PEM format for raw data
  if (
    configObject.certificateData &&
    !configObject.certificateData.includes('-----BEGIN CERTIFICATE-----')
  ) {
    throw new Error('Certificate data must be PEM-encoded');
  }
  if (
    configObject.privateKeyData &&
    !configObject.privateKeyData.includes('-----BEGIN PRIVATE KEY-----')
  ) {
    throw new Error('Private key data must be PEM-encoded');
  }
};
