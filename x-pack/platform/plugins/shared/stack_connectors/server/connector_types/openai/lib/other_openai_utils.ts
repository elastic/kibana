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
const validatePKICertificates = ({
  certificateFile,
  certificateData,
  privateKeyFile,
  privateKeyData,
  logger,
}: {
  logger: Logger;
  certificateFile?: string | string[];
  certificateData?: string;
  privateKeyFile?: string | string[];
  privateKeyData?: string;
}): void => {
  try {
    // Check file paths if provided
    if (certificateFile) {
      const certPath = Array.isArray(certificateFile) ? certificateFile[0] : certificateFile;
      if (!fs.existsSync(certPath)) {
        throw new Error(`Certificate file not found: ${certPath}`);
      }
      fs.accessSync(certPath, fs.constants.R_OK);
    }
    if (privateKeyFile) {
      const keyPath = Array.isArray(privateKeyFile) ? privateKeyFile[0] : privateKeyFile;
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key file not found: ${keyPath}`);
      }
      fs.accessSync(keyPath, fs.constants.R_OK);
    }

    // Check PEM format for data if provided
    if (certificateData && !certificateData.includes('-----BEGIN CERTIFICATE-----')) {
      throw new Error('Missing BEGIN CERTIFICATE header');
    }
    if (privateKeyData && !privateKeyData.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Missing BEGIN PRIVATE KEY header');
    }
  } catch (error) {
    logger.error(`Error validating PKI certificates: ${error.message}`);
    throw new Error('Invalid or inaccessible PKI certificates', error.message);
  }
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
}: {
  logger: Logger;
  certificateFile?: string | string[];
  certificateData?: string;
  privateKeyFile?: string | string[];
  privateKeyData?: string;
  caFile?: string | string[];
  caData?: string;
  verificationMode?: 'full' | 'certificate' | 'none';
}): SSLSettings => {
  // Validate PKI configuration
  validatePKICertificates({
    logger,
    certificateFile,
    certificateData,
    privateKeyFile,
    privateKeyData,
  });
  let cert: Buffer;
  let key: Buffer;
  let ca: Buffer | undefined;

  if (certificateFile) {
    cert = Buffer.from(
      fs.readFileSync(Array.isArray(certificateFile) ? certificateFile[0] : certificateFile, 'utf8')
    );
  } else if (certificateData) {
    cert = Buffer.from(formatPEMContent(certificateData, 'CERTIFICATE', logger));
  } else {
    throw new Error('No certificate file or data provided');
  }

  if (privateKeyFile) {
    key = Buffer.from(
      fs.readFileSync(Array.isArray(privateKeyFile) ? privateKeyFile[0] : privateKeyFile, 'utf8')
    );
  } else if (privateKeyData) {
    key = Buffer.from(formatPEMContent(privateKeyData, 'PRIVATE KEY'));
  } else {
    throw new Error('No private key file or data provided');
  }

  if (caFile) {
    ca = Buffer.from(fs.readFileSync(Array.isArray(caFile) ? caFile[0] : caFile, 'utf8'));
  } else if (caData) {
    ca = Buffer.from(formatPEMContent(caData, 'CERTIFICATE'));
  }

  return {
    cert,
    key,
    ca,
    verificationMode,
  };
};

function formatPEMContent(pemContent: string, type: 'CERTIFICATE' | 'PRIVATE KEY'): string {
  if (!pemContent) return pemContent;

  // Normalize input by replacing all whitespace with a single space
  const normalizedContent = pemContent.replace(/\s+/g, ' ').trim();

  // Define header and footer
  const header = `-----BEGIN ${type}-----`;
  const footer = `-----END ${type}-----`;

  // Verify header and footer
  if (!normalizedContent.startsWith(header) || !normalizedContent.endsWith(footer)) {
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

export const pkiErrorHandler = (error: AxiosError): string | undefined => {
  if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return `Certificate error: ${error.message}. Please check if your PKI certificates are valid or adjust SSL verification mode.`;
  }
  if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID' || error.code === 'ERR_TLS_HANDSHAKE') {
    return `TLS handshake failed: ${error.message}. Verify server certificate hostname and CA configuration.`;
  }
};
