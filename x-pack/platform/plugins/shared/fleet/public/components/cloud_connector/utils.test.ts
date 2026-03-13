/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';

import type { PackagePolicyConfigRecord } from '../../../common';
import type { AwsCloudConnectorVars, AzureCloudConnectorVars } from '../../../common/types';

import {
  updateInputVarsWithCredentials,
  isCloudConnectorReusableEnabled,
  isAwsCloudConnectorVars,
  isAzureCloudConnectorVars,
  getCloudConnectorRemoteRoleTemplate,
  getKibanaComponentId,
  getDeploymentIdFromUrl,
  getCloudConnectorNameError,
  isCloudConnectorNameValid,
  CLOUD_CONNECTOR_NAME_MAX_LENGTH,
} from './utils';
import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from './constants';
import type { CloudConnectorCredentials } from './types';
import { AWS_PROVIDER, AZURE_PROVIDER } from './constants';

describe('updateInputVarsWithCredentials - AWS support', () => {
  let mockInputVars: PackagePolicyConfigRecord;

  beforeEach(() => {
    mockInputVars = {
      role_arn: { value: 'arn:aws:iam::123456789012:role/OriginalRole' },
      external_id: { value: 'original-external-id' },
      'aws.role_arn': { value: 'arn:aws:iam::123456789012:role/OriginalAwsRole' },
      'aws.credentials.external_id': { value: 'original-aws-external-id' },
    };
  });

  it('should update role_arn fields when roleArn is provided', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.role_arn?.value).toBe('arn:aws:iam::123456789012:role/UpdatedRole');
    expect(result?.['aws.role_arn']?.value).toBe('arn:aws:iam::123456789012:role/UpdatedRole');
  });

  it('should update external_id fields when externalId is provided (not new credentials)', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.external_id?.value).toBe('updated-external-id');
    expect(result?.['aws.credentials.external_id']?.value).toBe('updated-external-id');
  });

  it('should update external_id fields when externalId is provided (new credentials)', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.external_id).toEqual({ value: 'updated-external-id' });
    expect(result?.['aws.credentials.external_id']?.value).toBe('updated-external-id');
  });

  it('should clear role_arn fields when roleArn is undefined', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: undefined,
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.role_arn).toEqual({ value: undefined });
    expect(result?.['aws.role_arn']).toEqual({ value: undefined });
  });

  it('should clear external_id fields when externalId is undefined', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: undefined,
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.external_id).toEqual({ value: undefined });
    expect(result?.['aws.credentials.external_id']).toEqual({ value: undefined });
  });

  it('should return undefined when inputVars is undefined', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(undefined, credentials);

    expect(result).toBeUndefined();
  });

  it('should handle partial inputVars (missing some fields)', () => {
    const partialInputVars: PackagePolicyConfigRecord = {
      role_arn: { value: 'arn:aws:iam::123456789012:role/OriginalRole' },
      // Missing other fields
    };

    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(partialInputVars, credentials);

    expect(result?.role_arn?.value).toBe('arn:aws:iam::123456789012:role/UpdatedRole');
    // Should not crash when fields are missing
    expect(result).toEqual(
      expect.objectContaining({
        role_arn: { value: 'arn:aws:iam::123456789012:role/UpdatedRole' },
      })
    );
  });

  it('should handle undefined credentials', () => {
    const result = updateInputVarsWithCredentials(mockInputVars, undefined);

    // Should clear all credential fields when credentials is undefined
    expect(result?.role_arn).toEqual({ value: undefined });
    expect(result?.external_id).toEqual({ value: undefined });
    expect(result?.['aws.role_arn']).toEqual({ value: undefined });
    expect(result?.['aws.credentials.external_id']).toEqual({ value: undefined });
  });
});

describe('updateInputVarsWithCredentials - Azure support', () => {
  let mockAzureInputVars: PackagePolicyConfigRecord;

  beforeEach(() => {
    mockAzureInputVars = {
      tenant_id: { value: 'old-tenant-id' },
      client_id: { value: 'old-client-id' },
      azure_credentials_cloud_connector_id: { value: 'old-cc-id' },
      'azure.credentials.tenant_id': { value: 'old-azure-tenant-id' },
      'azure.credentials.client_id': { value: 'old-azure-client-id' },
    };
  });

  it('should update Azure tenant_id and client_id fields', () => {
    const credentials: CloudConnectorCredentials = {
      tenantId: 'new-tenant-id',
      clientId: 'new-client-id',
      azure_credentials_cloud_connector_id: 'new-cc-id',
    };

    const result = updateInputVarsWithCredentials(mockAzureInputVars, credentials);

    expect(result?.tenant_id?.value).toBe('new-tenant-id');
    expect(result?.client_id?.value).toBe('new-client-id');
    expect(result?.azure_credentials_cloud_connector_id?.value).toBe('new-cc-id');
  });

  it('should update Azure credentials with azure.credentials.* format', () => {
    const credentials: CloudConnectorCredentials = {
      tenantId: 'new-azure-tenant-id',
      clientId: 'new-azure-client-id',
    };

    const result = updateInputVarsWithCredentials(mockAzureInputVars, credentials);

    expect(result?.['azure.credentials.tenant_id']?.value).toBe('new-azure-tenant-id');
    expect(result?.['azure.credentials.client_id']?.value).toBe('new-azure-client-id');
  });

  it('should clear Azure fields when credentials are undefined', () => {
    const credentials: CloudConnectorCredentials = {
      tenantId: undefined,
      clientId: undefined,
      azure_credentials_cloud_connector_id: undefined,
    };

    const result = updateInputVarsWithCredentials(mockAzureInputVars, credentials);

    expect(result?.tenant_id).toEqual({ value: undefined });
    expect(result?.client_id).toEqual({ value: undefined });
    expect(result?.azure_credentials_cloud_connector_id).toEqual({ value: undefined });
    expect(result?.['azure.credentials.tenant_id']).toEqual({ value: undefined });
    expect(result?.['azure.credentials.client_id']).toEqual({ value: undefined });
  });

  it('should handle partial Azure credentials', () => {
    const credentials: CloudConnectorCredentials = {
      tenantId: 'partial-tenant-id',
      clientId: undefined,
      azure_credentials_cloud_connector_id: 'partial-cc-id',
    };

    const result = updateInputVarsWithCredentials(mockAzureInputVars, credentials);

    expect(result?.tenant_id?.value).toBe('partial-tenant-id');
    expect(result?.client_id).toEqual({ value: undefined });
    expect(result?.azure_credentials_cloud_connector_id?.value).toBe('partial-cc-id');
  });

  it('should handle Azure credentials with secret references', () => {
    const credentials: CloudConnectorCredentials = {
      tenantId: { id: 'secret-tenant-id', isSecretRef: true },
      clientId: { id: 'secret-client-id', isSecretRef: true },
      azure_credentials_cloud_connector_id: 'secret-cc-id',
    };

    const result = updateInputVarsWithCredentials(mockAzureInputVars, credentials);

    expect(result?.tenant_id?.value).toEqual({ id: 'secret-tenant-id', isSecretRef: true });
    expect(result?.client_id?.value).toEqual({ id: 'secret-client-id', isSecretRef: true });
    expect(result?.azure_credentials_cloud_connector_id?.value).toBe('secret-cc-id');
  });
});

describe('updateInputVarsWithCredentials - supports_cloud_connectors flag', () => {
  it('should set supports_cloud_connectors to true when AWS credentials are provided and var exists', () => {
    const inputVars: PackagePolicyConfigRecord = {
      role_arn: { value: '' },
      external_id: { value: '' },
      supports_cloud_connectors: { value: undefined },
    };

    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/TestRole',
      externalId: 'test-external-id',
    };

    const result = updateInputVarsWithCredentials(inputVars, credentials);

    expect(result?.supports_cloud_connectors?.value).toBe(true);
  });

  it('should set supports_cloud_connectors to true when Azure credentials are provided and var exists', () => {
    const inputVars: PackagePolicyConfigRecord = {
      tenant_id: { value: '' },
      client_id: { value: '' },
      supports_cloud_connectors: { value: undefined },
    };

    const credentials: CloudConnectorCredentials = {
      tenantId: 'test-tenant-id',
      clientId: 'test-client-id',
    };

    const result = updateInputVarsWithCredentials(inputVars, credentials);

    expect(result?.supports_cloud_connectors?.value).toBe(true);
  });

  it('should set supports_cloud_connectors to false when credentials are undefined', () => {
    const inputVars: PackagePolicyConfigRecord = {
      role_arn: { value: 'some-arn' },
      external_id: { value: 'some-id' },
      supports_cloud_connectors: { value: true },
    };

    const result = updateInputVarsWithCredentials(inputVars, undefined);

    expect(result?.supports_cloud_connectors?.value).toBe(false);
  });

  it('should not add supports_cloud_connectors if it does not exist in input vars', () => {
    const inputVars: PackagePolicyConfigRecord = {
      role_arn: { value: '' },
      external_id: { value: '' },
    };

    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/TestRole',
      externalId: 'test-external-id',
    };

    const result = updateInputVarsWithCredentials(inputVars, credentials);

    expect(result).not.toHaveProperty('supports_cloud_connectors');
  });

  it('should preserve other properties on the supports_cloud_connectors var entry', () => {
    const inputVars: PackagePolicyConfigRecord = {
      role_arn: { value: '' },
      external_id: { value: '' },
      supports_cloud_connectors: { value: undefined, type: 'bool' },
    };

    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/TestRole',
      externalId: 'test-external-id',
    };

    const result = updateInputVarsWithCredentials(inputVars, credentials);

    expect(result?.supports_cloud_connectors?.value).toBe(true);
    expect(result?.supports_cloud_connectors?.type).toBe('bool');
  });
});

describe('isCloudConnectorReusableEnabled - AWS provider', () => {
  it('should return true for CSPM when package version meets minimum requirement', () => {
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '3.1.0-preview06', 'cspm')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '3.2.0', 'cspm')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '4.0.0', 'cspm')).toBe(true);
  });

  it('should return false for CSPM when package version is below minimum requirement', () => {
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '3.0.0', 'cspm')).toBe(false);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '3.1.0-preview05', 'cspm')).toBe(false);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '2.5.0', 'cspm')).toBe(false);
  });

  it('should return true for asset inventory when package version meets minimum requirement', () => {
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '1.1.5', 'asset_inventory')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '1.2.0', 'asset_inventory')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '2.0.0', 'asset_inventory')).toBe(true);
  });

  it('should return false for asset inventory when package version is below minimum requirement', () => {
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '1.1.4', 'asset_inventory')).toBe(false);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '1.0.0', 'asset_inventory')).toBe(false);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '0.9.0', 'asset_inventory')).toBe(false);
  });

  it('should handle unknown template names by defaulting to asset inventory version', () => {
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '1.1.5', 'unknown_template')).toBe(false);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '1.1.4', 'unknown_template')).toBe(false);
  });

  it('should handle edge cases with version formats', () => {
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '3.1.0', 'cspm')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AWS_PROVIDER, '3.1.0-preview06', 'cspm')).toBe(true);
  });
});

describe('isCloudConnectorReusableEnabled - Azure provider', () => {
  it('should return true for Azure CSPM when version meets requirement', () => {
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '3.1.0', 'cspm')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '3.2.0', 'cspm')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '4.0.0', 'cspm')).toBe(true);
  });

  it('should return false for Azure CSPM when version below requirement', () => {
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '3.0.9', 'cspm')).toBe(false);
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '2.9.0', 'cspm')).toBe(false);
  });

  it('should return true for Azure asset_inventory when version meets requirement', () => {
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '1.2.2', 'asset_inventory')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '1.3.0', 'asset_inventory')).toBe(true);
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '2.0.0', 'asset_inventory')).toBe(true);
  });

  it('should return false for Azure asset_inventory when version below requirement', () => {
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '1.2.1', 'asset_inventory')).toBe(false);
    expect(isCloudConnectorReusableEnabled(AZURE_PROVIDER, '1.1.0', 'asset_inventory')).toBe(false);
  });

  it('should return false for unknown providers', () => {
    expect(isCloudConnectorReusableEnabled('gcp', '9.9.9', 'cspm')).toBe(false);
    expect(isCloudConnectorReusableEnabled('unknown', '1.0.0', 'asset_inventory')).toBe(false);
  });
});

describe('Cloud Connector Type Guards', () => {
  describe('isAwsCloudConnectorVars', () => {
    it('should return true for AWS cloud connector vars with aws provider', () => {
      const awsVars: AwsCloudConnectorVars = {
        role_arn: { value: 'arn:aws:iam::123456789012:role/MyRole' },
        external_id: { value: { isSecretRef: true, id: 'secret-id' }, type: 'password' },
      };

      expect(isAwsCloudConnectorVars(awsVars, AWS_PROVIDER)).toBe(true);
    });

    it('should return false for AWS cloud connector vars with non-aws provider', () => {
      const awsVars: AwsCloudConnectorVars = {
        role_arn: { value: 'arn:aws:iam::123456789012:role/MyRole' },
        external_id: { value: { isSecretRef: true, id: 'secret-id' }, type: 'password' },
      };

      expect(isAwsCloudConnectorVars(awsVars, AZURE_PROVIDER)).toBe(false);
    });

    it('should return false for Azure cloud connector vars', () => {
      const azureVars: AzureCloudConnectorVars = {
        tenant_id: { value: { id: 'tenant-id', isSecretRef: true }, type: 'password' },
        client_id: { value: { id: 'client-id', isSecretRef: true }, type: 'password' },
        azure_credentials_cloud_connector_id: {
          value: 'connector-id',
          type: 'text',
        },
      };

      expect(isAwsCloudConnectorVars(azureVars, AWS_PROVIDER)).toBe(false);
    });
  });

  describe('isAzureCloudConnectorVars', () => {
    it('should return true for Azure cloud connector vars with azure provider', () => {
      const azureVars: AzureCloudConnectorVars = {
        tenant_id: { value: { id: 'tenant-id', isSecretRef: true }, type: 'password' },
        client_id: { value: { id: 'client-id', isSecretRef: true }, type: 'password' },
        azure_credentials_cloud_connector_id: {
          value: 'connector-id',
          type: 'text',
        },
      };

      expect(isAzureCloudConnectorVars(azureVars, AZURE_PROVIDER)).toBe(true);
    });

    it('should return false for Azure cloud connector vars with non-azure provider', () => {
      const awsVars: AwsCloudConnectorVars = {
        role_arn: { value: 'arn:aws:iam::123456789012:role/MyRole' },
        external_id: { value: { isSecretRef: true, id: 'secret-id' }, type: 'password' },
      };

      expect(isAzureCloudConnectorVars(awsVars, AWS_PROVIDER)).toBe(false);
    });

    it('should return false for AWS cloud connector vars', () => {
      const awsVars: AwsCloudConnectorVars = {
        role_arn: { value: 'arn:aws:iam::123456789012:role/MyRole' },
        external_id: { value: { isSecretRef: true, id: 'secret-id' }, type: 'password' },
      };

      expect(isAzureCloudConnectorVars(awsVars, AZURE_PROVIDER)).toBe(false);
    });
  });
});

describe('getCloudConnectorRemoteRoleTemplate', () => {
  // Cloud setup for testing - ESS deployment
  const mockCloudSetup = {
    isCloudEnabled: true,
    // Cloud ID format: name:base64(endpoint$deployment$kibanaId)
    // Decodes to: 'endpoint$deployment$kibana-component-id'
    cloudId: 'cluster:ZW5kcG9pbnQkZGVwbG95bWVudCRraWJhbmEtY29tcG9uZW50LWlk',
    baseUrl: 'https://elastic.co',
    deploymentUrl: 'https://cloud.elastic.co/deployments/deployment-123/kibana',
    profileUrl: 'https://elastic.co/profile',
    organizationUrl: 'https://elastic.co/organizations',
    snapshotsUrl: 'https://elastic.co/snapshots',
    isServerlessEnabled: false,
  } as CloudSetup;

  // Serverless cloud setup
  const mockServerlessCloudSetup = {
    isCloudEnabled: false,
    isServerlessEnabled: true,
    serverless: { projectId: 'serverless-project-id' },
  } as CloudSetup;

  const mockIacTemplateUrl =
    'https://example.com/templates/ACCOUNT_TYPE/RESOURCE_ID/cloudformation.yaml';

  describe('Successful template URL generation', () => {
    it('should generate template URL with ESS deployment resource ID', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: mockCloudSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toBe(
        'https://example.com/templates/single-account/kibana-component-id/cloudformation.yaml'
      );
    });

    it('should generate template URL with serverless project ID', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: mockServerlessCloudSetup,
        accountType: ORGANIZATION_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toBe(
        'https://example.com/templates/organization-account/serverless-project-id/cloudformation.yaml'
      );
    });

    it('should replace ACCOUNT_TYPE placeholder with organization-account', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: mockCloudSetup,
        accountType: ORGANIZATION_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toContain('/organization-account/');
      expect(result).not.toContain('ACCOUNT_TYPE');
    });

    it('should replace ACCOUNT_TYPE placeholder with single-account', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: mockCloudSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toContain('/single-account/');
      expect(result).not.toContain('ACCOUNT_TYPE');
    });

    it('should replace RESOURCE_ID placeholder with elastic resource ID', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: mockCloudSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toContain('/kibana-component-id/');
      expect(result).not.toContain('RESOURCE_ID');
    });

    it('should use ESS deployment ID when both serverless and cloud are enabled', () => {
      const hybridCloudSetup = {
        ...mockCloudSetup,
        isServerlessEnabled: true,
        serverless: { projectId: 'serverless-should-not-use' },
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: hybridCloudSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toContain('kibana-component-id');
      expect(result).not.toContain('serverless-should-not-use');
    });

    it('should handle complex cloud ID with base64 encoding', () => {
      const complexCloudSetup = {
        ...mockCloudSetup,
        // Decodes to: 'eu-west-1.aws.found.io$deployment-complex$complex-kibana-id'
        cloudId:
          'production:ZXUtd2VzdC0xLmF3cy5mb3VuZC5pbyRkZXBsb3ltZW50LWNvbXBsZXgkY29tcGxleC1raWJhbmEtaWQ=',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: complexCloudSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toContain('complex-kibana-id');
    });
  });

  describe('Failure cases', () => {
    it('should return undefined when iacTemplateUrl is not provided', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: mockCloudSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: undefined,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when no elastic resource ID is available', () => {
      const noResourceCloudSetup = {
        isCloudEnabled: false,
        isServerlessEnabled: false,
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: noResourceCloudSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when serverless is enabled but project ID is missing', () => {
      const serverlessNoProjectSetup = {
        isCloudEnabled: false,
        isServerlessEnabled: true,
        serverless: { projectId: undefined },
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: serverlessNoProjectSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when cloud is enabled but deployment URL is missing', () => {
      const noDeploymentUrlSetup = {
        ...mockCloudSetup,
        deploymentUrl: undefined,
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: noDeploymentUrlSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when cloud is enabled but cloud ID is missing', () => {
      const noCloudIdSetup = {
        ...mockCloudSetup,
        cloudId: undefined,
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: noCloudIdSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when cloud ID has missing kibana component', () => {
      const invalidCloudIdSetup = {
        ...mockCloudSetup,
        // Decodes to: 'endpoint$deployment' (no third part)
        cloudId: 'cluster:ZW5kcG9pbnQkZGVwbG95bWVudA==',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: invalidCloudIdSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when deployment URL has invalid format', () => {
      const invalidDeploymentUrlSetup = {
        ...mockCloudSetup,
        deploymentUrl: 'https://invalid-url-without-deployments-path',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        cloud: invalidDeploymentUrlSetup,
        accountType: SINGLE_ACCOUNT,
        iacTemplateUrl: mockIacTemplateUrl,
      });

      expect(result).toBeUndefined();
    });
  });
});

describe('getKibanaComponentId', () => {
  it('should extract kibana component ID from valid cloudId', () => {
    // cloudId format: name:base64(host$kibana-component-id$es-component-id)
    const cloudId = 'test:dGVzdC1ob3N0JGtpYmFuYS1jb21wb25lbnQtaWQkZXMtY29tcG9uZW50LWlk';
    const result = getKibanaComponentId(cloudId);
    expect(result).toBe('es-component-id');
  });

  it('should return undefined when cloudId is undefined', () => {
    const result = getKibanaComponentId(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined when cloudId has no colon', () => {
    const cloudId = 'invalid-cloud-id-without-colon';
    const result = getKibanaComponentId(cloudId);
    expect(result).toBeUndefined();
  });

  it('should return undefined when cloudId base64 part is empty', () => {
    const cloudId = 'test:';
    const result = getKibanaComponentId(cloudId);
    expect(result).toBeUndefined();
  });

  it('should return undefined when base64 decoding fails', () => {
    const cloudId = 'test:invalid-base64!!!';
    const result = getKibanaComponentId(cloudId);
    expect(result).toBeUndefined();
  });

  it('should return undefined when decoded value does not have expected format', () => {
    // Base64 encode a string without $ separators
    const encodedValue = btoa('no-dollar-signs');
    const cloudId = `test:${encodedValue}`;
    const result = getKibanaComponentId(cloudId);
    expect(result).toBeUndefined();
  });

  it('should handle cloudId with only one $ separator', () => {
    // Base64 encode a string with only one $ separator
    const encodedValue = btoa('host$component');
    const cloudId = `test:${encodedValue}`;
    const result = getKibanaComponentId(cloudId);
    expect(result).toBeUndefined();
  });
});

describe('getDeploymentIdFromUrl', () => {
  it('should extract deployment ID from valid deployment URL', () => {
    const url = 'https://cloud.elastic.co/deployments/deployment-123';
    const result = getDeploymentIdFromUrl(url);
    expect(result).toBe('deployment-123');
  });

  it('should extract deployment ID from URL with query parameters', () => {
    const url = 'https://cloud.elastic.co/deployments/deployment-456?tab=overview';
    const result = getDeploymentIdFromUrl(url);
    expect(result).toBe('deployment-456');
  });

  it('should extract deployment ID from URL with hash', () => {
    const url = 'https://cloud.elastic.co/deployments/deployment-789#section';
    const result = getDeploymentIdFromUrl(url);
    expect(result).toBe('deployment-789');
  });

  it('should return undefined when url is undefined', () => {
    const result = getDeploymentIdFromUrl(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined when url does not contain deployments path', () => {
    const url = 'https://cloud.elastic.co/some/other/path';
    const result = getDeploymentIdFromUrl(url);
    expect(result).toBeUndefined();
  });

  it('should handle deployment ID with special characters', () => {
    const url = 'https://cloud.elastic.co/deployments/deployment-abc-123-xyz';
    const result = getDeploymentIdFromUrl(url);
    expect(result).toBe('deployment-abc-123-xyz');
  });
});

describe('Cloud Connector Name Validation', () => {
  describe('CLOUD_CONNECTOR_NAME_MAX_LENGTH', () => {
    it('should be 255', () => {
      expect(CLOUD_CONNECTOR_NAME_MAX_LENGTH).toBe(255);
    });
  });

  describe('isCloudConnectorNameValid', () => {
    it('should return false for undefined name', () => {
      expect(isCloudConnectorNameValid(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isCloudConnectorNameValid('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(isCloudConnectorNameValid('   ')).toBe(false);
      expect(isCloudConnectorNameValid('\t\n')).toBe(false);
    });

    it('should return true for valid name', () => {
      expect(isCloudConnectorNameValid('my-connector')).toBe(true);
      expect(isCloudConnectorNameValid('Test Connector 123')).toBe(true);
    });

    it('should return true for name with exactly 255 characters', () => {
      const exactly255Chars = 'a'.repeat(255);
      expect(isCloudConnectorNameValid(exactly255Chars)).toBe(true);
    });

    it('should return false for name exceeding 255 characters', () => {
      const chars256 = 'a'.repeat(256);
      expect(isCloudConnectorNameValid(chars256)).toBe(false);
    });

    it('should handle boundary cases correctly', () => {
      expect(isCloudConnectorNameValid('a'.repeat(254))).toBe(true);
      expect(isCloudConnectorNameValid('a'.repeat(255))).toBe(true);
      expect(isCloudConnectorNameValid('a'.repeat(256))).toBe(false);
      expect(isCloudConnectorNameValid('a'.repeat(257))).toBe(false);
    });

    it('should handle special characters', () => {
      expect(isCloudConnectorNameValid('my-connector_123!@#')).toBe(true);
    });

    it('should handle unicode characters', () => {
      expect(isCloudConnectorNameValid('connector-中文-名称')).toBe(true);
    });
  });

  describe('getCloudConnectorNameError', () => {
    it('should return required error for undefined name', () => {
      expect(getCloudConnectorNameError(undefined)).toBe('Cloud Connector Name is required');
    });

    it('should return required error for empty string', () => {
      expect(getCloudConnectorNameError('')).toBe('Cloud Connector Name is required');
    });

    it('should return required error for whitespace-only string', () => {
      expect(getCloudConnectorNameError('   ')).toBe('Cloud Connector Name is required');
      expect(getCloudConnectorNameError('\t\n')).toBe('Cloud Connector Name is required');
    });

    it('should return undefined for valid name', () => {
      expect(getCloudConnectorNameError('my-connector')).toBeUndefined();
      expect(getCloudConnectorNameError('Test Connector 123')).toBeUndefined();
    });

    it('should return undefined for name with exactly 255 characters', () => {
      const exactly255Chars = 'a'.repeat(255);
      expect(getCloudConnectorNameError(exactly255Chars)).toBeUndefined();
    });

    it('should return length error for name exceeding 255 characters', () => {
      const chars256 = 'a'.repeat(256);
      expect(getCloudConnectorNameError(chars256)).toBe(
        'Cloud Connector Name must be 255 characters or less'
      );
    });

    it('should handle boundary cases correctly', () => {
      expect(getCloudConnectorNameError('a'.repeat(254))).toBeUndefined();
      expect(getCloudConnectorNameError('a'.repeat(255))).toBeUndefined();
      expect(getCloudConnectorNameError('a'.repeat(256))).toBe(
        'Cloud Connector Name must be 255 characters or less'
      );
    });
  });
});
