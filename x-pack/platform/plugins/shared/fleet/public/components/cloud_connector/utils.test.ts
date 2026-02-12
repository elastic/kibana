/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/public';

import type {
  PackagePolicyConfigRecord,
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '../../../common';
import type { AwsCloudConnectorVars, AzureCloudConnectorVars } from '../../../common/types';

import {
  updateInputVarsWithCredentials,
  updatePolicyWithAwsCloudConnectorCredentials,
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
import { getMockPolicyAWS, getMockPackageInfoAWS } from './test/mock';
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

describe('updatePolicyWithAwsCloudConnectorCredentials', () => {
  let mockPackagePolicy: NewPackagePolicy;
  let mockInput: NewPackagePolicyInput;

  beforeEach(() => {
    mockInput = {
      type: 'cloudbeat/cis_aws',
      policy_template: 'cis_aws',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/OriginalRole' },
            external_id: { value: 'original-external-id' },
            'aws.role_arn': { value: 'arn:aws:iam::123456789012:role/OriginalAwsRole' },
            'aws.credentials.external_id': { value: 'original-aws-external-id' },
          },
        },
      ],
    };

    mockPackagePolicy = {
      id: 'test-policy-id',
      enabled: true,
      policy_id: 'test-policy',
      policy_ids: ['test-policy'],
      name: 'test-policy',
      namespace: 'default',
      package: {
        name: 'cloud_security_posture',
        title: 'Cloud Security Posture',
        version: '1.0.0',
      },
      inputs: [
        {
          type: 'cloudbeat/cis_aws',
          policy_template: 'cis_aws',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
              vars: mockInput.streams[0].vars,
            },
          ],
        },
      ],
    };
  });

  it('should return original policy when credentials is empty object', () => {
    const result = updatePolicyWithAwsCloudConnectorCredentials(mockPackagePolicy, mockInput, {});

    expect(result).toStrictEqual(mockPackagePolicy);
  });

  it('should update role_arn when provided in credentials', () => {
    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    expect(result.inputs[0].streams[0].vars?.role_arn.value).toBe(
      'arn:aws:iam::123456789012:role/UpdatedRole'
    );
  });

  it('should update external_id when provided in credentials', () => {
    const credentials = {
      external_id: 'updated-external-id',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    expect(result.inputs[0].streams[0].vars?.external_id.value).toBe('updated-external-id');
  });

  it('should update aws.role_arn when provided in credentials', () => {
    const credentials = {
      'aws.role_arn': 'arn:aws:iam::123456789012:role/UpdatedAwsRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    expect(result.inputs[0].streams[0].vars?.['aws.role_arn'].value).toBe(
      'arn:aws:iam::123456789012:role/UpdatedAwsRole'
    );
  });

  it('should update aws.credentials.external_id when provided in credentials', () => {
    const credentials = {
      'aws.credentials.external_id': 'updated-aws-external-id',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    expect(result.inputs[0].streams[0].vars?.['aws.credentials.external_id'].value).toBe(
      'updated-aws-external-id'
    );
  });

  it('should handle multiple credential fields at once', () => {
    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      external_id: 'updated-external-id',
      'aws.role_arn': 'arn:aws:iam::123456789012:role/UpdatedAwsRole',
      'aws.credentials.external_id': 'updated-aws-external-id',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    const updatedVars = result.inputs[0].streams[0].vars;
    expect(updatedVars?.role_arn.value).toBe('arn:aws:iam::123456789012:role/UpdatedRole');
    expect(updatedVars?.external_id.value).toBe('updated-external-id');
    expect(updatedVars?.['aws.role_arn'].value).toBe(
      'arn:aws:iam::123456789012:role/UpdatedAwsRole'
    );
    expect(updatedVars?.['aws.credentials.external_id'].value).toBe('updated-aws-external-id');
  });

  it('should handle policy without inputs', () => {
    const policyWithoutInputs = { ...mockPackagePolicy, inputs: [] };

    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      policyWithoutInputs,
      mockInput,
      credentials
    );

    expect(result.inputs).toEqual([]);
  });

  it('should return policy with empty inputs array when inputs is undefined', () => {
    const policyWithoutInputs = { ...mockPackagePolicy };
    delete (policyWithoutInputs as Partial<NewPackagePolicy>).inputs;

    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      policyWithoutInputs,
      mockInput,
      credentials
    );

    expect(result.inputs).toEqual([]);
  });

  it('should return updated policy when input streams vars is undefined', () => {
    const inputWithoutVars: NewPackagePolicyInput = {
      type: 'test-input',
      policy_template: 'test-template',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'test.dataset' },
        },
      ],
    };

    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      inputWithoutVars,
      credentials
    );

    expect(result).toEqual(
      expect.objectContaining({
        inputs: expect.any(Array),
      })
    );
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
  const mockInput = getMockPolicyAWS().inputs[0];
  const mockPackageInfo = getMockPackageInfoAWS();

  // AWS-specific cloud setup
  const mockAwsCloudSetup = {
    isCloudEnabled: true,
    // Cloud ID format: name:base64(endpoint$deployment$kibanaId)
    // Decodes to: 'aws-endpoint$aws-deployment$aws-kibana-id'
    cloudId: 'aws-cluster:YXdzLWVuZHBvaW50JGF3cy1kZXBsb3ltZW50JGF3cy1raWJhbmEtaWQ=',
    baseUrl: 'https://aws.elastic.co',
    deploymentUrl: 'https://cloud.elastic.co/deployments/aws-deployment-123/kibana',
    profileUrl: 'https://aws.elastic.co/profile',
    organizationUrl: 'https://aws.elastic.co/organizations',
    snapshotsUrl: 'https://aws.elastic.co/snapshots',
    isServerlessEnabled: false,
  } as CloudSetup;

  // Azure-specific cloud setup
  const mockAzureCloudSetup = {
    isCloudEnabled: true,
    // Cloud ID format: name:base64(endpoint$deployment$kibanaId)
    // Decodes to: 'azure-endpoint$azure-deployment$azure-kibana-id'
    cloudId: 'azure-cluster:YXp1cmUtZW5kcG9pbnQkYXp1cmUtZGVwbG95bWVudCRhenVyZS1raWJhbmEtaWQ=',
    baseUrl: 'https://azure.elastic.co',
    deploymentUrl: 'https://cloud.elastic.co/deployments/azure-deployment-456/kibana',
    profileUrl: 'https://azure.elastic.co/profile',
    organizationUrl: 'https://azure.elastic.co/organizations',
    snapshotsUrl: 'https://azure.elastic.co/snapshots',
    isServerlessEnabled: false,
  } as CloudSetup;

  // GCP-specific cloud setup
  const mockGcpCloudSetup = {
    isCloudEnabled: true,
    // Cloud ID format: name:base64(endpoint$deployment$kibanaId)
    // Decodes to: 'gcp-endpoint$gcp-deployment$gcp-kibana-id'
    cloudId: 'gcp-cluster:Z2NwLWVuZHBvaW50JGdjcC1kZXBsb3ltZW50JGdjcC1raWJhbmEtaWQ=',
    baseUrl: 'https://gcp.elastic.co',
    deploymentUrl: 'https://cloud.elastic.co/deployments/gcp-deployment-789/kibana',
    profileUrl: 'https://gcp.elastic.co/profile',
    organizationUrl: 'https://gcp.elastic.co/organizations',
    snapshotsUrl: 'https://gcp.elastic.co/snapshots',
    isServerlessEnabled: false,
  } as CloudSetup;

  beforeEach(() => {
    // Add cloud_formation_cloud_connectors_template to mock package info
    const policyTemplate = mockPackageInfo.policy_templates?.[0];
    if (policyTemplate && 'inputs' in policyTemplate && policyTemplate.inputs?.[0]?.vars) {
      policyTemplate.inputs[0].vars = [
        ...(policyTemplate.inputs[0].vars || []),
        {
          name: 'cloud_formation_cloud_connectors_template',
          type: 'text',
          title: 'CloudFormation Template',
          multi: false,
          required: false,
          show_user: false,
          default:
            'https://s3.amazonaws.com/cloudformation-templates/ACCOUNT_TYPE/RESOURCE_ID/template.yaml',
        },
      ];
    }
  });

  describe('AWS Provider - Successful cases', () => {
    it('should generate template URL for AWS with serverless enabled', () => {
      const serverlessCloudSetup = {
        ...mockAwsCloudSetup,
        isCloudEnabled: false, // Disable ESS to test serverless only
        isServerlessEnabled: true,
        serverless: { projectId: 'aws-serverless-project' },
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: serverlessCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBe(
        'https://s3.amazonaws.com/cloudformation-templates/single-account/aws-serverless-project/template.yaml'
      );
    });

    it('should generate template URL for AWS with cloud ESS deployment', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: mockAwsCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBe(
        'https://s3.amazonaws.com/cloudformation-templates/single-account/aws-kibana-id/template.yaml'
      );
    });

    it('should use cloud ESS deployment ID when both serverless and cloud are enabled', () => {
      // Note: When both are enabled, cloud ESS takes precedence (last assignment wins)
      const hybridCloudSetup = {
        ...mockAwsCloudSetup,
        isServerlessEnabled: true,
        serverless: { projectId: 'serverless-priority' },
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: hybridCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      // Current behavior: cloud ESS ID overwrites serverless project ID
      expect(result).toContain('aws-kibana-id');
      expect(result).not.toContain('serverless-priority');
    });

    it('should use organization-account type when specified in input', () => {
      const orgInput: NewPackagePolicyInput = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              'aws.account_type': { value: 'organization-account', type: 'text' },
            },
          },
        ],
      };

      const result = getCloudConnectorRemoteRoleTemplate({
        input: orgInput,
        cloud: mockAwsCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toContain('/organization-account/');
    });

    it('should use single-account type by default for AWS', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: mockAwsCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toContain('/single-account/');
    });

    it('should handle complex cloud ID with base64 encoding for AWS', () => {
      const complexCloudSetup = {
        ...mockAwsCloudSetup,
        // Cloud ID format: name:base64(endpoint$deployment$kibanaId)
        // Decodes to: 'eu-west-1.aws.found.io$deployment-complex$aws-kibana-complex-id'
        cloudId:
          'production:ZXUtd2VzdC0xLmF3cy5mb3VuZC5pbyRkZXBsb3ltZW50LWNvbXBsZXgkYXdzLWtpYmFuYS1jb21wbGV4LWlk',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: complexCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toContain('aws-kibana-complex-id');
    });

    it('should handle complex cloud ID with base64 encoding for GCP', () => {
      const complexGcpCloudSetup = {
        ...mockGcpCloudSetup,
        // Cloud ID format: name:base64(endpoint$deployment$kibanaId)
        // Decodes to: 'us-central1.gcp.cloud.es.io$gcp-deployment-complex$gcp-kibana-complex-id'
        cloudId:
          'gcp-production:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvJGdjcC1kZXBsb3ltZW50LWNvbXBsZXgkZ2NwLWtpYmFuYS1jb21wbGV4LWlk',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: complexGcpCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toContain('gcp-kibana-complex-id');
    });

    it('should handle complex cloud ID with base64 encoding for Azure', () => {
      const complexAzureCloudSetup = {
        ...mockAzureCloudSetup,
        // Cloud ID format: name:base64(endpoint$deployment$kibanaId)
        // Decodes to: 'westeurope.azure.elastic-cloud.com$azure-deployment-complex$azure-kibana-complex-id'
        cloudId:
          'azure-production:d2VzdGV1cm9wZS5henVyZS5lbGFzdGljLWNsb3VkLmNvbSRhenVyZS1kZXBsb3ltZW50LWNvbXBsZXgkYXp1cmUta2liYW5hLWNvbXBsZXgtaWQ=',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: complexAzureCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toContain('azure-kibana-complex-id');
    });

    it('should handle deployment URL with different formats', () => {
      const differentUrlSetup = {
        ...mockAwsCloudSetup,
        deploymentUrl:
          'https://cloud.elastic.co/deployments/aws-deployment-with-dashes-123/kibana/app',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: differentUrlSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeDefined();
      expect(result).toContain('aws-kibana-id');
    });
  });

  describe('AWS Provider - Failure cases', () => {
    it('should return undefined when no elastic resource ID is available', () => {
      const noResourceCloudSetup = {
        ...mockAwsCloudSetup,
        isCloudEnabled: false,
        isServerlessEnabled: false,
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: noResourceCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when serverless is enabled but project ID is missing', () => {
      const serverlessNoProjectSetup = {
        ...mockAwsCloudSetup,
        isCloudEnabled: false, // Disable ESS fallback
        isServerlessEnabled: true,
        serverless: { projectId: undefined },
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: serverlessNoProjectSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when cloud is enabled but deployment URL is missing', () => {
      const noDeploymentUrlSetup = {
        ...mockAwsCloudSetup,
        deploymentUrl: undefined,
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: noDeploymentUrlSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when cloud is enabled but cloud ID is missing', () => {
      const noCloudIdSetup = {
        ...mockAwsCloudSetup,
        cloudId: undefined,
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: noCloudIdSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when provider is invalid', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: mockAwsCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        // @ts-expect-error Testing invalid provider type
        provider: 'invalid-provider',
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when template name does not exist in package info', () => {
      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: mockAwsCloudSetup,
        packageInfo: mockPackageInfo,
        templateName: 'non-existent-template',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when template URL field is not found in package info', () => {
      const originalTemplate = mockPackageInfo.policy_templates![0];
      const packageInfoWithoutTemplate = {
        ...mockPackageInfo,
        policy_templates: [
          {
            ...originalTemplate,
            ...('inputs' in originalTemplate && originalTemplate.inputs
              ? {
                  inputs: [
                    {
                      ...originalTemplate.inputs[0],
                      vars: [], // Empty vars array
                    },
                  ],
                }
              : {}),
          },
        ],
      } as PackageInfo;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: mockAwsCloudSetup,
        packageInfo: packageInfoWithoutTemplate,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when cloud ID has missing kibana component', () => {
      const invalidCloudIdSetup = {
        ...mockAwsCloudSetup,
        // Cloud ID format: name:base64(endpoint$deployment) - missing kibana ID
        // Decodes to: 'aws-endpoint$aws-deployment' (no third part)
        cloudId: 'aws-cluster:YXdzLWVuZHBvaW50JGF3cy1kZXBsb3ltZW50',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: invalidCloudIdSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined when deployment URL has invalid format', () => {
      const invalidDeploymentUrlSetup = {
        ...mockAwsCloudSetup,
        deploymentUrl: 'https://invalid-url-without-deployments-path',
      } as CloudSetup;

      const result = getCloudConnectorRemoteRoleTemplate({
        input: mockInput,
        cloud: invalidDeploymentUrlSetup,
        packageInfo: mockPackageInfo,
        templateName: 'cspm',
        provider: AWS_PROVIDER,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('Azure Provider Tests', () => {
    let azureInput: NewPackagePolicyInput;
    let azurePackageInfo: PackageInfo;

    beforeEach(() => {
      // Create Azure-specific input
      azureInput = {
        ...mockInput,
        type: 'cloudbeat/cis_azure',
        policy_template: 'cspm',
        streams: [
          {
            enabled: true,
            data_stream: { type: 'logs', dataset: 'cloud_security_posture.findings' },
            vars: {
              'azure.account_type': { value: 'single-account', type: 'text' },
            },
          },
        ],
      };

      // Create Azure-specific package info with ARM template URL
      azurePackageInfo = {
        ...mockPackageInfo,
        policy_templates: [
          {
            name: 'cspm',
            title: 'CSPM',
            description: 'CSPM',
            inputs: [
              {
                type: 'cloudbeat/cis_azure',
                title: 'Azure CIS',
                description: 'Azure CIS compliance monitoring',
                vars: [
                  {
                    name: 'arm_template_cloud_connectors_url',
                    type: 'text',
                    title: 'ARM Template URL',
                    multi: false,
                    required: false,
                    show_user: false,
                    default:
                      'https://portal.azure.com/ACCOUNT_TYPE/deploy/RESOURCE_ID/template.json',
                  },
                ],
              },
            ],
          },
        ],
      } as PackageInfo;
    });

    describe('Successful cases', () => {
      it('should generate ARM template URL for Azure with serverless enabled', () => {
        const serverlessCloudSetup = {
          ...mockAzureCloudSetup,
          isCloudEnabled: false,
          isServerlessEnabled: true,
          serverless: { projectId: 'azure-serverless-project' },
        } as CloudSetup;

        const result = getCloudConnectorRemoteRoleTemplate({
          input: azureInput,
          cloud: serverlessCloudSetup,
          packageInfo: azurePackageInfo,
          templateName: 'cspm',
          provider: AZURE_PROVIDER,
        });

        expect(result).toBe(
          'https://portal.azure.com/single-account/deploy/azure-serverless-project/template.json'
        );
      });

      it('should generate ARM template URL for Azure with cloud ESS deployment', () => {
        const result = getCloudConnectorRemoteRoleTemplate({
          input: azureInput,
          cloud: mockAzureCloudSetup,
          packageInfo: azurePackageInfo,
          templateName: 'cspm',
          provider: AZURE_PROVIDER,
        });

        expect(result).toBe(
          'https://portal.azure.com/single-account/deploy/azure-kibana-id/template.json'
        );
      });

      it('should use Azure single-account type by default', () => {
        const azureInputNoAccountType: NewPackagePolicyInput = {
          ...azureInput,
          streams: [
            {
              ...azureInput.streams[0],
              vars: {},
            },
          ],
        };

        const result = getCloudConnectorRemoteRoleTemplate({
          input: azureInputNoAccountType,
          cloud: mockAzureCloudSetup,
          packageInfo: azurePackageInfo,
          templateName: 'cspm',
          provider: AZURE_PROVIDER,
        });

        expect(result).toContain('/single-account/');
      });

      it('should handle complex Azure cloud ID with base64 encoding', () => {
        const complexAzureCloudSetup = {
          ...mockAzureCloudSetup,
          // Cloud ID format: name:base64(endpoint$deployment$kibanaId)
          // Decodes to: 'westeurope.azure.elastic-cloud.com$azure-complex$azure-kibana-complex'
          cloudId:
            'azure-production:d2VzdGV1cm9wZS5henVyZS5lbGFzdGljLWNsb3VkLmNvbSRhenVyZS1jb21wbGV4JGF6dXJlLWtpYmFuYS1jb21wbGV4',
        } as CloudSetup;

        const result = getCloudConnectorRemoteRoleTemplate({
          input: azureInput,
          cloud: complexAzureCloudSetup,
          packageInfo: azurePackageInfo,
          templateName: 'cspm',
          provider: AZURE_PROVIDER,
        });

        expect(result).toContain('azure-kibana-complex');
      });
    });

    describe('Failure cases', () => {
      it('should return undefined when Azure template URL field is not found', () => {
        const originalTemplate = azurePackageInfo.policy_templates![0];
        const packageInfoWithoutArmTemplate = {
          ...azurePackageInfo,
          policy_templates: [
            {
              ...originalTemplate,
              ...('inputs' in originalTemplate && originalTemplate.inputs
                ? {
                    inputs: [
                      {
                        ...originalTemplate.inputs[0],
                        vars: [],
                      },
                    ],
                  }
                : {}),
            },
          ],
        } as PackageInfo;

        const result = getCloudConnectorRemoteRoleTemplate({
          input: azureInput,
          cloud: mockAzureCloudSetup,
          packageInfo: packageInfoWithoutArmTemplate,
          templateName: 'cspm',
          provider: AZURE_PROVIDER,
        });

        expect(result).toBeUndefined();
      });

      it('should return undefined when no elastic resource ID is available for Azure', () => {
        const noResourceCloudSetup = {
          ...mockAzureCloudSetup,
          isCloudEnabled: false,
          isServerlessEnabled: false,
        } as CloudSetup;

        const result = getCloudConnectorRemoteRoleTemplate({
          input: azureInput,
          cloud: noResourceCloudSetup,
          packageInfo: azurePackageInfo,
          templateName: 'cspm',
          provider: AZURE_PROVIDER,
        });

        expect(result).toBeUndefined();
      });
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
