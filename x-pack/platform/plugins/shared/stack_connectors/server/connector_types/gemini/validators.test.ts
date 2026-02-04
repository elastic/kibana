/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateGeminiSecrets } from './validators';
import type { Secrets } from '@kbn/connector-schemas/gemini';

// Mock i18n
jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
  },
}));

describe('validateGeminiSecrets', () => {
  const validServiceAccount = {
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'some_id',
    private_key: 'some_key',
    client_email: 'test@example.com',
    client_id: '12345',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40example.com',
  };

  test('should pass with valid service_account credentials', () => {
    const secrets: Secrets = {
      credentialsJson: JSON.stringify(validServiceAccount),
    };
    expect(() => validateGeminiSecrets(secrets)).not.toThrow();
  });

  test('should throw error for external_account credentials', () => {
    const secrets: Secrets = {
      credentialsJson: JSON.stringify({
        type: 'external_account',
        audience:
          '//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        credential_source: {
          file: '/etc/passwd',
        },
      }),
    };
    expect(() => validateGeminiSecrets(secrets)).toThrow();
  });

  test('should throw error for authorized_user credentials', () => {
    const secrets: Secrets = {
      credentialsJson: JSON.stringify({
        type: 'authorized_user',
        client_id: '...',
        client_secret: '...',
        refresh_token: '...',
      }),
    };
    expect(() => validateGeminiSecrets(secrets)).toThrow();
  });

  test('should throw error for invalid JSON', () => {
    const secrets: Secrets = {
      credentialsJson: '{ invalid json }',
    };
    expect(() => validateGeminiSecrets(secrets)).toThrow('Invalid JSON format for credentials.');
  });

  test('should throw error for missing type field', () => {
    const secrets: Secrets = {
      credentialsJson: JSON.stringify({
        project_id: 'test',
      }),
    };
    expect(() => validateGeminiSecrets(secrets)).toThrow();
  });

  test('should throw error for empty credentials', () => {
    const secrets: Secrets = {
      credentialsJson: '',
    };
    expect(() => validateGeminiSecrets(secrets)).toThrow(
      'Google Service Account credentials JSON is required.'
    );
  });
});
