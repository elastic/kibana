/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../types/models/epm';
import type { NewPackagePolicy } from '../../types/models/package_policy';

import {
  detectStorageMode,
  resolveVarTarget,
  readCredentials,
  writeCredentials,
  createCloudConnectorVarAccessor,
  extractRawCredentialVars,
} from './var_accessor';
import { CloudConnectorVarAccessorError, CloudConnectorVarAccessorErrorCode } from './types';

describe('Cloud Connector Var Accessor', () => {
  // Test fixtures
  const createPackageInfoWithVarGroups = (): PackageInfo =>
    ({
      name: 'test-package',
      version: '1.0.0',
      var_groups: [
        {
          name: 'cloud_credentials',
          title: 'Cloud Credentials',
          selector_title: 'Select credentials type',
          options: [
            {
              name: 'aws_assume_role',
              title: 'AWS Assume Role',
              provider: 'aws',
              cloud_connector_enabled: true,
              vars: ['role_arn', 'external_id'],
            },
          ],
        },
      ],
    } as unknown as PackageInfo);

  const createPackageInfoWithoutVarGroups = (): PackageInfo =>
    ({
      name: 'test-package',
      version: '1.0.0',
    } as PackageInfo);

  const createPackagePolicyWithPackageVars = (): NewPackagePolicy => ({
    name: 'test-policy',
    namespace: 'default',
    enabled: true,
    policy_ids: ['policy-1'],
    inputs: [
      {
        type: 'test-input',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { type: 'logs', dataset: 'test' },
          },
        ],
      },
    ],
    vars: {
      role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/TestRole' },
      external_id: { type: 'password', value: { id: 'secret-123', isSecretRef: true } },
    },
  });

  const createPackagePolicyWithStreamVars = (): NewPackagePolicy => ({
    name: 'test-policy',
    namespace: 'default',
    enabled: true,
    policy_ids: ['policy-1'],
    inputs: [
      {
        type: 'test-input',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { type: 'logs', dataset: 'test' },
            vars: {
              role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/StreamRole' },
              external_id: { type: 'password', value: 'stream-secret' },
            },
          },
        ],
      },
    ],
  });

  const createPackagePolicyWithAzureVars = (): NewPackagePolicy => ({
    name: 'test-policy',
    namespace: 'default',
    enabled: true,
    policy_ids: ['policy-1'],
    inputs: [
      {
        type: 'test-input',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { type: 'logs', dataset: 'test' },
            vars: {
              tenant_id: { type: 'password', value: 'tenant-123' },
              client_id: { type: 'password', value: 'client-456' },
              azure_credentials_cloud_connector_id: { type: 'text', value: 'azure-connector-789' },
            },
          },
        ],
      },
    ],
  });

  describe('detectStorageMode', () => {
    it('should return "package" when var_groups with cloud connector options exist', () => {
      const packageInfo = createPackageInfoWithVarGroups();
      expect(detectStorageMode(packageInfo)).toBe('package');
    });

    it('should return "input" when no var_groups exist', () => {
      const packageInfo = createPackageInfoWithoutVarGroups();
      expect(detectStorageMode(packageInfo)).toBe('input');
    });

    it('should return "input" when packageInfo is undefined', () => {
      expect(detectStorageMode(undefined)).toBe('input');
    });

    it('should return "input" when var_groups exist but without cloud connector options', () => {
      const packageInfo = {
        name: 'test-package',
        version: '1.0.0',
        var_groups: [
          {
            name: 'other_settings',
            title: 'Other Settings',
            selector_title: 'Select option',
            options: [
              {
                name: 'option1',
                title: 'Option 1',
                vars: ['some_other_var'],
              },
            ],
          },
        ],
      } as unknown as PackageInfo;
      expect(detectStorageMode(packageInfo)).toBe('input');
    });
  });

  describe('resolveVarTarget', () => {
    describe('package mode', () => {
      it('should return package vars container', () => {
        const policy = createPackagePolicyWithPackageVars();
        const result = resolveVarTarget(policy, 'package');

        expect(result.mode).toBe('package');
        expect(result.target).toEqual({ mode: 'package' });
        expect(result.vars).toEqual(policy.vars);
      });

      it('should return undefined vars if policy has no vars', () => {
        const policy = createPackagePolicyWithStreamVars();
        const result = resolveVarTarget(policy, 'package');

        expect(result.mode).toBe('package');
        expect(result.vars).toBeUndefined();
      });
    });

    describe('input mode', () => {
      it('should return stream vars for single enabled input and stream', () => {
        const policy = createPackagePolicyWithStreamVars();
        const result = resolveVarTarget(policy, 'input');

        expect(result.mode).toBe('input');
        expect(result.target).toEqual({ mode: 'input', inputIndex: 0, streamIndex: 0 });
        expect(result.vars).toEqual(policy.inputs[0].streams[0].vars);
      });

      it('should throw error when no enabled inputs', () => {
        const policy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          enabled: true,
          policy_ids: ['policy-1'],
          inputs: [
            {
              type: 'test-input',
              enabled: false,
              streams: [],
            },
          ],
        };

        expect(() => resolveVarTarget(policy, 'input')).toThrow(CloudConnectorVarAccessorError);
        expect(() => resolveVarTarget(policy, 'input')).toThrow(
          expect.objectContaining({
            code: CloudConnectorVarAccessorErrorCode.NO_ENABLED_INPUTS,
          })
        );
      });

      it('should throw error when multiple enabled inputs', () => {
        const policy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          enabled: true,
          policy_ids: ['policy-1'],
          inputs: [
            {
              type: 'test-input-1',
              enabled: true,
              streams: [{ enabled: true, data_stream: { type: 'logs', dataset: 'test1' } }],
            },
            {
              type: 'test-input-2',
              enabled: true,
              streams: [{ enabled: true, data_stream: { type: 'logs', dataset: 'test2' } }],
            },
          ],
        };

        expect(() => resolveVarTarget(policy, 'input')).toThrow(CloudConnectorVarAccessorError);
        expect(() => resolveVarTarget(policy, 'input')).toThrow(
          expect.objectContaining({
            code: CloudConnectorVarAccessorErrorCode.MULTIPLE_ENABLED_INPUTS,
          })
        );
      });

      it('should throw error when no enabled streams', () => {
        const policy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          enabled: true,
          policy_ids: ['policy-1'],
          inputs: [
            {
              type: 'test-input',
              enabled: true,
              streams: [{ enabled: false, data_stream: { type: 'logs', dataset: 'test' } }],
            },
          ],
        };

        expect(() => resolveVarTarget(policy, 'input')).toThrow(CloudConnectorVarAccessorError);
        expect(() => resolveVarTarget(policy, 'input')).toThrow(
          expect.objectContaining({
            code: CloudConnectorVarAccessorErrorCode.NO_ENABLED_STREAMS,
          })
        );
      });

      it('should throw error when multiple enabled streams', () => {
        const policy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          enabled: true,
          policy_ids: ['policy-1'],
          inputs: [
            {
              type: 'test-input',
              enabled: true,
              streams: [
                { enabled: true, data_stream: { type: 'logs', dataset: 'test1' } },
                { enabled: true, data_stream: { type: 'logs', dataset: 'test2' } },
              ],
            },
          ],
        };

        expect(() => resolveVarTarget(policy, 'input')).toThrow(CloudConnectorVarAccessorError);
        expect(() => resolveVarTarget(policy, 'input')).toThrow(
          expect.objectContaining({
            code: CloudConnectorVarAccessorErrorCode.MULTIPLE_ENABLED_STREAMS,
          })
        );
      });
    });
  });

  describe('readCredentials', () => {
    describe('AWS provider', () => {
      it('should read AWS credentials from package-level vars', () => {
        const policy = createPackagePolicyWithPackageVars();
        const result = readCredentials(policy, 'aws', 'package');

        expect(result.isComplete).toBe(true);
        expect(result.missingVarKeys).toEqual([]);
        expect(result.vars.role_arn).toEqual({
          type: 'text',
          value: 'arn:aws:iam::123456789012:role/TestRole',
        });
        expect(result.vars.external_id).toEqual({
          type: 'password',
          value: { id: 'secret-123', isSecretRef: true },
        });
      });

      it('should read AWS credentials from stream-level vars', () => {
        const policy = createPackagePolicyWithStreamVars();
        const result = readCredentials(policy, 'aws', 'input');

        expect(result.isComplete).toBe(true);
        expect(result.vars.role_arn).toEqual({
          type: 'text',
          value: 'arn:aws:iam::123456789012:role/StreamRole',
        });
        expect(result.vars.external_id).toEqual({
          type: 'password',
          value: 'stream-secret',
        });
      });

      it('should report incomplete when vars are missing', () => {
        const policy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          enabled: true,
          policy_ids: ['policy-1'],
          inputs: [
            {
              type: 'test-input',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'test' },
                  vars: {
                    role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/TestRole' },
                    // external_id is missing
                  },
                },
              ],
            },
          ],
        };

        const result = readCredentials(policy, 'aws', 'input');

        expect(result.isComplete).toBe(false);
        expect(result.missingVarKeys).toContain('external_id');
      });

      it('should find vars using alternative keys', () => {
        const policy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          enabled: true,
          policy_ids: ['policy-1'],
          inputs: [
            {
              type: 'test-input',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'test' },
                  vars: {
                    'aws.role_arn': {
                      type: 'text',
                      value: 'arn:aws:iam::123456789012:role/AltRole',
                    },
                    'aws.credentials.external_id': { type: 'password', value: 'alt-secret' },
                  },
                },
              ],
            },
          ],
        };

        const result = readCredentials(policy, 'aws', 'input');

        expect(result.isComplete).toBe(true);
        expect(result.vars.role_arn.value).toBe('arn:aws:iam::123456789012:role/AltRole');
        expect(result.vars.external_id.value).toBe('alt-secret');
      });
    });

    describe('Azure provider', () => {
      it('should read Azure credentials from stream-level vars', () => {
        const policy = createPackagePolicyWithAzureVars();
        const result = readCredentials(policy, 'azure', 'input');

        expect(result.isComplete).toBe(true);
        expect(result.vars.tenant_id.value).toBe('tenant-123');
        expect(result.vars.client_id.value).toBe('client-456');
        expect(result.vars.azure_credentials_cloud_connector_id.value).toBe('azure-connector-789');
      });
    });

    describe('GCP provider (stub)', () => {
      it('should return empty vars for GCP (not yet supported)', () => {
        const policy = createPackagePolicyWithStreamVars();
        const result = readCredentials(policy, 'gcp', 'input');

        // GCP has no var keys defined yet, so it should be "complete" but empty
        expect(result.isComplete).toBe(true);
        expect(result.missingVarKeys).toEqual([]);
        expect(Object.keys(result.vars)).toHaveLength(0);
      });
    });
  });

  describe('writeCredentials', () => {
    it('should write AWS credentials to package-level vars', () => {
      const policy = createPackagePolicyWithPackageVars();
      const newCredentials = {
        role_arn: { type: 'text', value: 'arn:aws:iam::999999999999:role/NewRole' },
        external_id: { type: 'password', value: { id: 'new-secret', isSecretRef: true } },
      };

      const result = writeCredentials(policy, 'aws', newCredentials, 'package');

      expect(result.vars?.role_arn.value).toBe('arn:aws:iam::999999999999:role/NewRole');
      expect(result.vars?.external_id.value).toEqual({ id: 'new-secret', isSecretRef: true });
    });

    it('should write AWS credentials to stream-level vars', () => {
      const policy = createPackagePolicyWithStreamVars();
      const newCredentials = {
        role_arn: { type: 'text', value: 'arn:aws:iam::999999999999:role/NewStreamRole' },
        external_id: { type: 'password', value: 'new-stream-secret' },
      };

      const result = writeCredentials(policy, 'aws', newCredentials, 'input');

      expect(result.inputs[0].streams[0].vars?.role_arn.value).toBe(
        'arn:aws:iam::999999999999:role/NewStreamRole'
      );
      expect(result.inputs[0].streams[0].vars?.external_id.value).toBe('new-stream-secret');
    });

    it('should preserve existing vars when writing', () => {
      const policy: NewPackagePolicy = {
        name: 'test-policy',
        namespace: 'default',
        enabled: true,
        policy_ids: ['policy-1'],
        inputs: [
          {
            type: 'test-input',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'test' },
                vars: {
                  existing_var: { type: 'text', value: 'existing-value' },
                  role_arn: { type: 'text', value: 'old-role' },
                },
              },
            ],
          },
        ],
      };

      const newCredentials = {
        role_arn: { type: 'text', value: 'new-role' },
        external_id: { type: 'password', value: 'new-secret' },
      };

      const result = writeCredentials(policy, 'aws', newCredentials, 'input');

      expect(result.inputs[0].streams[0].vars?.existing_var.value).toBe('existing-value');
      expect(result.inputs[0].streams[0].vars?.role_arn.value).toBe('new-role');
      expect(result.inputs[0].streams[0].vars?.external_id.value).toBe('new-secret');
    });
  });

  describe('createCloudConnectorVarAccessor', () => {
    it('should create an accessor with bound methods', () => {
      const accessor = createCloudConnectorVarAccessor({ provider: 'aws' });

      expect(accessor.detectMode).toBeDefined();
      expect(accessor.resolveTarget).toBeDefined();
      expect(accessor.read).toBeDefined();
      expect(accessor.write).toBeDefined();
      expect(accessor.getSchema).toBeDefined();
    });

    it('should use forced mode when provided', () => {
      const accessor = createCloudConnectorVarAccessor({ provider: 'aws', forcedMode: 'package' });
      const packageInfo = createPackageInfoWithoutVarGroups();

      // Even though packageInfo has no var_groups (would normally be 'input'),
      // the forced mode should override
      expect(accessor.detectMode(packageInfo)).toBe('package');
    });

    it('should read credentials using the accessor', () => {
      const accessor = createCloudConnectorVarAccessor({ provider: 'aws', forcedMode: 'input' });
      const policy = createPackagePolicyWithStreamVars();

      const result = accessor.read(policy);

      expect(result.isComplete).toBe(true);
      expect(result.vars.role_arn.value).toBe('arn:aws:iam::123456789012:role/StreamRole');
    });

    it('should return the correct schema', () => {
      const awsAccessor = createCloudConnectorVarAccessor({ provider: 'aws' });
      const azureAccessor = createCloudConnectorVarAccessor({ provider: 'azure' });

      expect(awsAccessor.getSchema().provider).toBe('aws');
      expect(awsAccessor.getSchema().varKeys).toHaveLength(2);

      expect(azureAccessor.getSchema().provider).toBe('azure');
      expect(azureAccessor.getSchema().varKeys).toHaveLength(3);
    });
  });

  describe('extractRawCredentialVars', () => {
    it('should extract vars from package-level for package mode', () => {
      const packageInfo = createPackageInfoWithVarGroups();
      const policy = createPackagePolicyWithPackageVars();

      const vars = extractRawCredentialVars(policy, 'aws', packageInfo);

      expect(vars).toEqual(policy.vars);
    });

    it('should extract vars from stream-level for input mode', () => {
      const packageInfo = createPackageInfoWithoutVarGroups();
      const policy = createPackagePolicyWithStreamVars();

      const vars = extractRawCredentialVars(policy, 'aws', packageInfo);

      expect(vars).toEqual(policy.inputs[0].streams[0].vars);
    });

    it('should fallback gracefully when validation fails', () => {
      // Policy with multiple enabled inputs (invalid for strict input mode)
      const policy: NewPackagePolicy = {
        name: 'test-policy',
        namespace: 'default',
        enabled: true,
        policy_ids: ['policy-1'],
        inputs: [
          {
            type: 'test-input-1',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'test1' },
                vars: { stream_var: { type: 'text', value: 'stream-value' } },
              },
            ],
          },
          {
            type: 'test-input-2',
            enabled: true,
            streams: [],
          },
        ],
      };

      // Should not throw, but return the first available vars
      const vars = extractRawCredentialVars(policy, 'aws');

      expect(vars).toEqual({ stream_var: { type: 'text', value: 'stream-value' } });
    });
  });
});
