/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AWS_CREDENTIAL_VAR_KEYS,
  AZURE_CREDENTIAL_VAR_KEYS,
  GCP_CREDENTIAL_VAR_KEYS,
  getCredentialSchema,
  getSecretVarKeys,
  isSecretVarKey,
} from './schemas';
import { CloudConnectorVarAccessorError, CloudConnectorVarAccessorErrorCode } from './types';

describe('Cloud Connector Schemas', () => {
  describe('AWS_CREDENTIAL_VAR_KEYS', () => {
    it('should have the correct structure for role_arn', () => {
      const roleArnKey = AWS_CREDENTIAL_VAR_KEYS.find((k) => k.logicalName === 'role_arn');

      expect(roleArnKey).toBeDefined();
      expect(roleArnKey?.varKey).toBe('role_arn');
      expect(roleArnKey?.alternativeKeys).toContain('aws.role_arn');
      expect(roleArnKey?.isSecret).toBe(false);
      expect(roleArnKey?.varType).toBe('text');
    });

    it('should have the correct structure for external_id', () => {
      const externalIdKey = AWS_CREDENTIAL_VAR_KEYS.find((k) => k.logicalName === 'external_id');

      expect(externalIdKey).toBeDefined();
      expect(externalIdKey?.varKey).toBe('external_id');
      expect(externalIdKey?.alternativeKeys).toContain('aws.credentials.external_id');
      expect(externalIdKey?.isSecret).toBe(true);
      expect(externalIdKey?.varType).toBe('password');
    });
  });

  describe('AZURE_CREDENTIAL_VAR_KEYS', () => {
    it('should have tenant_id as a secret', () => {
      const tenantIdKey = AZURE_CREDENTIAL_VAR_KEYS.find((k) => k.logicalName === 'tenant_id');

      expect(tenantIdKey).toBeDefined();
      expect(tenantIdKey?.isSecret).toBe(true);
      expect(tenantIdKey?.varType).toBe('password');
    });

    it('should have client_id as a secret', () => {
      const clientIdKey = AZURE_CREDENTIAL_VAR_KEYS.find((k) => k.logicalName === 'client_id');

      expect(clientIdKey).toBeDefined();
      expect(clientIdKey?.isSecret).toBe(true);
      expect(clientIdKey?.varType).toBe('password');
    });

    it('should have azure_credentials_cloud_connector_id as non-secret', () => {
      const credIdKey = AZURE_CREDENTIAL_VAR_KEYS.find(
        (k) => k.logicalName === 'azure_credentials_cloud_connector_id'
      );

      expect(credIdKey).toBeDefined();
      expect(credIdKey?.isSecret).toBe(false);
      expect(credIdKey?.varType).toBe('text');
    });
  });

  describe('GCP_CREDENTIAL_VAR_KEYS', () => {
    it('should be empty (placeholder for future support)', () => {
      expect(GCP_CREDENTIAL_VAR_KEYS).toHaveLength(0);
    });
  });

  describe('getCredentialSchema', () => {
    it('should return AWS schema with correct provider', () => {
      const schema = getCredentialSchema('aws');

      expect(schema.provider).toBe('aws');
      expect(schema.varKeys).toEqual(AWS_CREDENTIAL_VAR_KEYS);
    });

    it('should return Azure schema with correct provider', () => {
      const schema = getCredentialSchema('azure');

      expect(schema.provider).toBe('azure');
      expect(schema.varKeys).toEqual(AZURE_CREDENTIAL_VAR_KEYS);
    });

    it('should return GCP schema (empty) with correct provider', () => {
      const schema = getCredentialSchema('gcp');

      expect(schema.provider).toBe('gcp');
      expect(schema.varKeys).toEqual(GCP_CREDENTIAL_VAR_KEYS);
    });

    it('should throw error for unsupported provider', () => {
      expect(() => getCredentialSchema('invalid' as any)).toThrow(CloudConnectorVarAccessorError);
      expect(() => getCredentialSchema('invalid' as any)).toThrow(
        expect.objectContaining({
          code: CloudConnectorVarAccessorErrorCode.UNSUPPORTED_PROVIDER,
        })
      );
    });
  });

  describe('getSecretVarKeys', () => {
    it('should return only secret keys for AWS', () => {
      const secretKeys = getSecretVarKeys('aws');

      expect(secretKeys).toContain('external_id');
      expect(secretKeys).not.toContain('role_arn');
      expect(secretKeys).toHaveLength(1);
    });

    it('should return only secret keys for Azure', () => {
      const secretKeys = getSecretVarKeys('azure');

      expect(secretKeys).toContain('tenant_id');
      expect(secretKeys).toContain('client_id');
      expect(secretKeys).not.toContain('azure_credentials_cloud_connector_id');
      expect(secretKeys).toHaveLength(2);
    });

    it('should return empty array for GCP (no keys defined)', () => {
      const secretKeys = getSecretVarKeys('gcp');

      expect(secretKeys).toHaveLength(0);
    });
  });

  describe('isSecretVarKey', () => {
    describe('AWS', () => {
      it('should return true for external_id', () => {
        expect(isSecretVarKey('aws', 'external_id')).toBe(true);
      });

      it('should return true for alternative key aws.credentials.external_id', () => {
        expect(isSecretVarKey('aws', 'aws.credentials.external_id')).toBe(true);
      });

      it('should return false for role_arn', () => {
        expect(isSecretVarKey('aws', 'role_arn')).toBe(false);
      });

      it('should return false for unknown key', () => {
        expect(isSecretVarKey('aws', 'unknown_key')).toBe(false);
      });
    });

    describe('Azure', () => {
      it('should return true for tenant_id', () => {
        expect(isSecretVarKey('azure', 'tenant_id')).toBe(true);
      });

      it('should return true for client_id', () => {
        expect(isSecretVarKey('azure', 'client_id')).toBe(true);
      });

      it('should return true for alternative key azure.credentials.tenant_id', () => {
        expect(isSecretVarKey('azure', 'azure.credentials.tenant_id')).toBe(true);
      });

      it('should return false for azure_credentials_cloud_connector_id', () => {
        expect(isSecretVarKey('azure', 'azure_credentials_cloud_connector_id')).toBe(false);
      });
    });
  });
});
