/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AWS_CREDENTIAL_SCHEMA,
  AZURE_CREDENTIAL_SCHEMA,
  GCP_CREDENTIAL_SCHEMA,
  CREDENTIAL_SCHEMAS,
  getCredentialSchema,
  getAllVarKeys,
  getAllSupportedVarNames,
} from './schemas';

describe('Cloud Connector Schemas', () => {
  describe('AWS_CREDENTIAL_SCHEMA', () => {
    it('should have correct provider', () => {
      expect(AWS_CREDENTIAL_SCHEMA.provider).toBe('aws');
    });

    it('should have roleArn field with correct keys', () => {
      const { roleArn } = AWS_CREDENTIAL_SCHEMA.fields;
      expect(roleArn.primary).toBe('role_arn');
      expect(roleArn.aliases).toContain('aws.role_arn');
      expect(roleArn.isSecret).toBe(false);
    });

    it('should have externalId field with correct keys', () => {
      const { externalId } = AWS_CREDENTIAL_SCHEMA.fields;
      expect(externalId.primary).toBe('external_id');
      expect(externalId.aliases).toContain('aws.credentials.external_id');
      expect(externalId.isSecret).toBe(true);
    });
  });

  describe('AZURE_CREDENTIAL_SCHEMA', () => {
    it('should have correct provider', () => {
      expect(AZURE_CREDENTIAL_SCHEMA.provider).toBe('azure');
    });

    it('should have tenantId field with correct keys', () => {
      const { tenantId } = AZURE_CREDENTIAL_SCHEMA.fields;
      expect(tenantId.primary).toBe('tenant_id');
      expect(tenantId.aliases).toContain('azure.credentials.tenant_id');
      expect(tenantId.isSecret).toBe(true);
    });

    it('should have clientId field with correct keys', () => {
      const { clientId } = AZURE_CREDENTIAL_SCHEMA.fields;
      expect(clientId.primary).toBe('client_id');
      expect(clientId.aliases).toContain('azure.credentials.client_id');
      expect(clientId.isSecret).toBe(true);
    });

    it('should have azureCredentialsCloudConnectorId field with correct keys', () => {
      const { azureCredentialsCloudConnectorId } = AZURE_CREDENTIAL_SCHEMA.fields;
      expect(azureCredentialsCloudConnectorId.primary).toBe('azure_credentials_cloud_connector_id');
      expect(azureCredentialsCloudConnectorId.isSecret).toBe(false);
    });
  });

  describe('GCP_CREDENTIAL_SCHEMA', () => {
    it('should have correct provider', () => {
      expect(GCP_CREDENTIAL_SCHEMA.provider).toBe('gcp');
    });

    it('should have stub fields for future implementation', () => {
      expect(GCP_CREDENTIAL_SCHEMA.fields.projectId).toBeDefined();
      expect(GCP_CREDENTIAL_SCHEMA.fields.serviceAccountKey).toBeDefined();
    });
  });

  describe('CREDENTIAL_SCHEMAS', () => {
    it('should contain all provider schemas', () => {
      expect(CREDENTIAL_SCHEMAS.aws).toBe(AWS_CREDENTIAL_SCHEMA);
      expect(CREDENTIAL_SCHEMAS.azure).toBe(AZURE_CREDENTIAL_SCHEMA);
      expect(CREDENTIAL_SCHEMAS.gcp).toBe(GCP_CREDENTIAL_SCHEMA);
    });
  });

  describe('getCredentialSchema', () => {
    it('should return AWS schema for aws provider', () => {
      const schema = getCredentialSchema('aws');
      expect(schema).toBe(AWS_CREDENTIAL_SCHEMA);
    });

    it('should return Azure schema for azure provider', () => {
      const schema = getCredentialSchema('azure');
      expect(schema).toBe(AZURE_CREDENTIAL_SCHEMA);
    });

    it('should return GCP schema for gcp provider', () => {
      const schema = getCredentialSchema('gcp');
      expect(schema).toBe(GCP_CREDENTIAL_SCHEMA);
    });

    it('should throw for unknown provider', () => {
      expect(() => getCredentialSchema('unknown' as any)).toThrow('Unknown cloud provider');
    });
  });

  describe('getAllVarKeys', () => {
    it('should return primary and all aliases', () => {
      const keys = getAllVarKeys(AWS_CREDENTIAL_SCHEMA.fields.roleArn);
      expect(keys).toContain('role_arn');
      expect(keys).toContain('aws.role_arn');
      expect(keys.length).toBe(2);
    });

    it('should include all Azure tenant_id keys', () => {
      const keys = getAllVarKeys(AZURE_CREDENTIAL_SCHEMA.fields.tenantId);
      expect(keys).toContain('tenant_id');
      expect(keys).toContain('azure.credentials.tenant_id');
    });
  });

  describe('getAllSupportedVarNames', () => {
    it('should include all credential var names from all providers', () => {
      const allVarNames = getAllSupportedVarNames();

      // AWS vars
      expect(allVarNames).toContain('role_arn');
      expect(allVarNames).toContain('aws.role_arn');
      expect(allVarNames).toContain('external_id');
      expect(allVarNames).toContain('aws.credentials.external_id');

      // Azure vars
      expect(allVarNames).toContain('tenant_id');
      expect(allVarNames).toContain('azure.credentials.tenant_id');
      expect(allVarNames).toContain('client_id');
      expect(allVarNames).toContain('azure.credentials.client_id');
      expect(allVarNames).toContain('azure_credentials_cloud_connector_id');

      // GCP vars
      expect(allVarNames).toContain('project_id');
      expect(allVarNames).toContain('service_account_key');
    });

    it('should return a non-empty array', () => {
      const allVarNames = getAllSupportedVarNames();
      expect(allVarNames.length).toBeGreaterThan(0);
    });
  });
});
