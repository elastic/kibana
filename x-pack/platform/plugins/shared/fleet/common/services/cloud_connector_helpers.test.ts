/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsCloudConnectorVars,
  AzureCloudConnectorVars,
  CloudConnectorSecretReference,
  CloudConnectorVar,
  CloudConnectorSecretVar,
} from '../types/models/cloud_connector';

import { isAwsCloudConnectorVars, isAzureCloudConnectorVars } from './cloud_connector_helpers';

describe('cloud_connector_helpers', () => {
  const mockSecretReference: CloudConnectorSecretReference = {
    id: 'secret-123',
    isSecretRef: true,
  };

  const mockRoleArn: CloudConnectorVar = {
    type: 'text',
    value: 'arn:aws:iam::123456789012:role/MyRole',
  };

  const mockSecretVar: CloudConnectorSecretVar = {
    type: 'password',
    value: mockSecretReference,
  };

  const mockAzureCredentialsId: CloudConnectorVar = {
    type: 'text',
    value: 'azure-connector-id-123',
  };

  describe('isAwsCloudConnectorVars', () => {
    it('should return true for valid AWS cloud connector vars', () => {
      const awsVars: AwsCloudConnectorVars = {
        role_arn: mockRoleArn,
        external_id: mockSecretVar,
      };

      expect(isAwsCloudConnectorVars(awsVars)).toBe(true);
    });

    it('should return false for partial AWS cloud connector vars (missing role_arn)', () => {
      const partialVars = {
        external_id: mockSecretVar,
      };

      expect(isAwsCloudConnectorVars(partialVars)).toBe(false);
    });

    it('should return false for partial AWS cloud connector vars (missing external_id)', () => {
      const partialVars = {
        role_arn: mockRoleArn,
      };

      expect(isAwsCloudConnectorVars(partialVars)).toBe(false);
    });

    it('should return false for Azure cloud connector vars', () => {
      const azureVars: AzureCloudConnectorVars = {
        tenant_id: mockSecretVar,
        client_id: mockSecretVar,
        azure_credentials_cloud_connector_id: mockAzureCredentialsId,
      };

      expect(isAwsCloudConnectorVars(azureVars)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isAwsCloudConnectorVars({})).toBe(false);
    });
  });

  describe('isAzureCloudConnectorVars', () => {
    it('should return true for valid Azure cloud connector vars', () => {
      const azureVars: AzureCloudConnectorVars = {
        tenant_id: mockSecretVar,
        client_id: mockSecretVar,
        azure_credentials_cloud_connector_id: mockAzureCredentialsId,
      };

      expect(isAzureCloudConnectorVars(azureVars)).toBe(true);
    });

    it('should return false for partial Azure cloud connector vars (missing tenant_id)', () => {
      const partialVars = {
        client_id: mockSecretVar,
        azure_credentials_cloud_connector_id: mockAzureCredentialsId,
      };

      expect(isAzureCloudConnectorVars(partialVars)).toBe(false);
    });

    it('should return false for partial Azure cloud connector vars (missing client_id)', () => {
      const partialVars = {
        tenant_id: mockSecretVar,
        azure_credentials_cloud_connector_id: mockAzureCredentialsId,
      };

      expect(isAzureCloudConnectorVars(partialVars)).toBe(false);
    });

    it('should return false for partial Azure cloud connector vars (missing azure_credentials_cloud_connector_id)', () => {
      const partialVars = {
        tenant_id: mockSecretVar,
        client_id: mockSecretVar,
      };

      expect(isAzureCloudConnectorVars(partialVars)).toBe(false);
    });

    it('should return false for AWS cloud connector vars', () => {
      const awsVars: AwsCloudConnectorVars = {
        role_arn: mockRoleArn,
        external_id: mockSecretVar,
      };

      expect(isAzureCloudConnectorVars(awsVars)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isAzureCloudConnectorVars({})).toBe(false);
    });
  });
});
