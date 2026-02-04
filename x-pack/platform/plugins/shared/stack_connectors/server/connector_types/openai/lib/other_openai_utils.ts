/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SSLSettings } from '@kbn/actions-utils';
import type { AxiosError } from 'axios';
import type { Secrets } from '@kbn/connector-schemas/openai';

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
/**
 * Input interface for SSL overrides.
 */
interface SSLOverridesInput {
  logger: Logger; // Logger instance for logging errors or information.
  certificateData: string; // PEM-encoded certificate data as a string.
  privateKeyData: string; // PEM-encoded private key data as a string.
  caData?: string; // PEM-encoded CA certificate data as a string.
  verificationMode: 'full' | 'certificate' | 'none'; // SSL verification mode.
}

/**
 * Validates that the provided PEM data is in the correct format.
 *
 * @param data - The PEM data to validate.
 * @param type - The type of PEM data ('CERTIFICATE' or 'PRIVATE KEY').
 * @param description - A description of the data being validated.
 * @throws Will throw an error if the PEM data is not in the correct format.
 */
const PEM_HEADERS: Record<'PRIVATE KEY' | 'CERTIFICATE', string[]> = {
  'PRIVATE KEY': ['-----BEGIN PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----'],
  CERTIFICATE: ['-----BEGIN CERTIFICATE-----'],
};
const PEM_FOOTERS: Record<'PRIVATE KEY' | 'CERTIFICATE', string[]> = {
  'PRIVATE KEY': ['-----END PRIVATE KEY-----', '-----END RSA PRIVATE KEY-----'],
  CERTIFICATE: ['-----END CERTIFICATE-----'],
};

function getPEMHeaderFooter(
  type: 'CERTIFICATE' | 'PRIVATE KEY',
  content: string
): { header: string; footer: string } | undefined {
  const headers = PEM_HEADERS[type];
  const footers = PEM_FOOTERS[type];
  for (let i = 0; i < headers.length; ++i) {
    if (content.includes(headers[i])) {
      return { header: headers[i], footer: footers[i] };
    }
  }
  return undefined;
}

const validatePEMData = (
  data: string | undefined,
  type: 'CERTIFICATE' | 'PRIVATE KEY',
  description: string
): void => {
  const decodedData = data ? Buffer.from(data, 'base64').toString() : undefined;
  if (!decodedData) return;
  const headers = PEM_HEADERS[type];
  const found = headers.some((h) => decodedData.includes(h));
  if (!found) {
    const headerMsg =
      headers.length === 1 ? `"${headers[0]}"` : headers.map((h) => `"${h}"`).join(' or ');
    throw new Error(
      `Invalid ${description} file format: The file must be a PEM-encoded ${type.toLowerCase()} beginning with ${headerMsg}.`
    );
  }
};

/**
 * Validates the provided PKI certificates for correct PEM formatting.
 *
 * @param input - An object containing certificate, private key, and CA data, along with a logger.
 * @throws Will log and throw an error if any of the provided certificates are invalid.
 */
const validatePKICertificates = ({
  certificateData,
  privateKeyData,
  caData,
  logger,
}: Omit<SSLOverridesInput, 'verificationMode'>): void => {
  try {
    validatePEMData(certificateData, 'CERTIFICATE', 'Certificate data');
    validatePEMData(privateKeyData, 'PRIVATE KEY', 'Private key data');
    if (caData) validatePEMData(caData, 'CERTIFICATE', 'CA certificate data');
  } catch (error) {
    logger.error(`Error validating PKI certificates: ${error.message}`);
    throw new Error(`Invalid or inaccessible PKI certificates: ${error.message}`);
  }
};

/**
 * Converts PEM data into a Buffer.
 *
 * @param data - The PEM data to convert.
 * @param type - The type of PEM data ('CERTIFICATE' or 'PRIVATE KEY').
 * @returns A Buffer containing the PEM data.
 * @throws Will throw an error if no data is provided.
 */
const loadBuffer = (data: string, type: 'CERTIFICATE' | 'PRIVATE KEY'): Buffer => {
  if (data) {
    return Buffer.from(formatPEMContent(Buffer.from(data, 'base64').toString(), type));
  }
  throw new Error(`No ${type?.toLowerCase()} data provided`);
};

/**
 * Generates SSL settings for PKI authentication.
 *
 * @param input - An object containing logger, certificate, private key, and CA data, along with verification mode.
 * @returns An SSLSettings object containing the certificate, private key, CA, and verification mode.
 * @throws Will throw an error if the provided certificates are invalid or missing.
 */
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
  // CA can be undefined for verification mode "none".
  const ca = caData ? loadBuffer(caData, 'CERTIFICATE') : undefined;

  return { cert, key, ca, verificationMode };
};

/**
 * Formats PEM content to ensure proper structure and line breaks.
 *
 * @param pemContent - The PEM content to format.
 * @param type - The type of PEM data ('CERTIFICATE' or 'PRIVATE KEY').
 * @returns A properly formatted PEM string.
 */
function formatPEMContent(pemContent: string, type: 'CERTIFICATE' | 'PRIVATE KEY'): string {
  if (!pemContent) return pemContent;
  const normalizedContent = pemContent.replace(/\s+/g, ' ').trim();
  const headerFooter = getPEMHeaderFooter(type, normalizedContent);
  if (!headerFooter) {
    return pemContent;
  }
  const { header, footer } = headerFooter;
  if (!normalizedContent.startsWith(header) || !normalizedContent.endsWith(footer)) {
    return pemContent;
  }
  const base64Content = normalizedContent
    .slice(header.length, normalizedContent.length - footer.length)
    .replace(/\s+/g, '');
  const formattedBase64 = base64Content.match(/.{1,64}/g)?.join('\n') || base64Content;
  return `${header}\n${formattedBase64}\n${footer}`;
}

/**
 * Handles PKI-related errors and provides user-friendly error messages.
 *
 * @param error - The AxiosError object containing details about the error.
 * @returns A string with a user-friendly error message, or undefined if the error is not recognized.
 */
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

/**
 * Validates the PKI configuration object to ensure required fields are present and properly formatted.
 *
 * @param secretsObject - The configuration object containing PKI-related data.
 * @throws Will throw an error if required fields are missing or if the provided data is not in valid PEM format.
 */
export const pkiSecretsValidator = (secretsObject: Secrets): void => {
  if (
    'caData' in secretsObject ||
    'certificateData' in secretsObject ||
    'privateKeyData' in secretsObject
  ) {
    if (!secretsObject.certificateData) {
      throw new Error('Certificate data must be provided for PKI');
    }
    if (!secretsObject.privateKeyData) {
      throw new Error('Private key data must be provided for PKI');
    }
    // Validate PEM format for raw data
    validatePEMData(secretsObject.certificateData, 'CERTIFICATE', 'Certificate data');
    validatePEMData(secretsObject.privateKeyData, 'PRIVATE KEY', 'Private key data');
    // CA is optional, but if provided, validate its format
    if (secretsObject.caData) {
      validatePEMData(secretsObject.caData, 'CERTIFICATE', 'CA certificate data');
    }
  } else {
    throw new Error('PKI configuration requires certificate and private key');
  }
};
/**
 * Validates the apiKey in the secrets object for non-PKI authentication.
 * @param secretsObject
 */
export const nonPkiSecretsValidator = (secretsObject: Secrets): void => {
  if (!secretsObject.apiKey) {
    throw Object.assign(
      new Error('[apiKey]: expected value of type [string] but got [undefined]'),
      {
        statusCode: 400,
      }
    );
  }
};
