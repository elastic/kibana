/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../types/models/epm';
import type { NewPackagePolicy } from '../../types/models/package_policy';

import {
  getCredentialStorageScope,
  resolveVarTarget,
  applyVarsAtTarget,
  extractRawCredentialVars,
  readCredentials,
  writeCredentials,
  getVarTarget,
  findFirstVarEntry,
} from './var_accessor';

// Mock PackageInfo with package-level vars (package mode)
const createPackageLevelPackageInfo = (): PackageInfo =>
  ({
    name: 'test-package',
    title: 'Test Package',
    version: '1.0.0',
    release: 'ga',
    description: 'Test package with package-level vars',
    type: 'integration',
    owner: { github: 'elastic/test' },
    format_version: '1.0.0',
    vars: [
      { name: 'role_arn', type: 'text', title: 'Role ARN' },
      { name: 'external_id', type: 'password', title: 'External ID', secret: true },
    ],
    policy_templates: [],
  } as unknown as PackageInfo);

// Mock PackageInfo with input-level vars (input mode)
const createInputLevelPackageInfo = (): PackageInfo =>
  ({
    name: 'test-package',
    title: 'Test Package',
    version: '1.0.0',
    release: 'ga',
    description: 'Test package with input-level vars',
    type: 'integration',
    owner: { github: 'elastic/test' },
    format_version: '1.0.0',
    vars: [], // No package-level credential vars
    policy_templates: [],
  } as unknown as PackageInfo);

// Mock package policy with package-level vars
const createPackageLevelPolicy = (): NewPackagePolicy => ({
  name: 'test-policy',
  namespace: 'default',
  enabled: true,
  policy_ids: ['test-agent-policy'],
  vars: {
    role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole' },
    external_id: { value: 'test-external-id-123' },
  },
  inputs: [
    {
      type: 'aws-cloudtrail',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
          vars: {}, // Empty stream vars in package mode
        },
      ],
    },
  ],
});

// Mock package policy with input-level vars
const createInputLevelPolicy = (): NewPackagePolicy => ({
  name: 'test-policy',
  namespace: 'default',
  enabled: true,
  policy_ids: ['test-agent-policy'],
  vars: {}, // No package-level vars
  inputs: [
    {
      type: 'aws-cloudtrail',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole' },
            external_id: { value: 'test-external-id-123' },
          },
        },
      ],
    },
  ],
});

// Mock package policy with Azure credentials
const createAzureInputLevelPolicy = (): NewPackagePolicy => ({
  name: 'test-policy',
  namespace: 'default',
  enabled: true,
  policy_ids: ['test-agent-policy'],
  vars: {},
  inputs: [
    {
      type: 'azure-logs',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'azure.logs' },
          vars: {
            tenant_id: { value: 'tenant-123' },
            client_id: { value: 'client-456' },
            azure_credentials_cloud_connector_id: { value: 'connector-789' },
          },
        },
      ],
    },
  ],
});

describe('Cloud Connector Var Accessor', () => {
  describe('getCredentialStorageScope', () => {
    it('should detect package mode when PackageInfo.vars contains credential vars', () => {
      const packageInfo = createPackageLevelPackageInfo();
      const mode = getCredentialStorageScope(packageInfo);
      expect(mode).toBe('package');
    });

    it('should detect input mode when PackageInfo.vars does not contain credential vars', () => {
      const packageInfo = createInputLevelPackageInfo();
      const mode = getCredentialStorageScope(packageInfo);
      expect(mode).toBe('input');
    });

    it('should detect input mode when PackageInfo.vars is undefined', () => {
      const packageInfo = { ...createInputLevelPackageInfo(), vars: undefined } as PackageInfo;
      const mode = getCredentialStorageScope(packageInfo);
      expect(mode).toBe('input');
    });
  });

  describe('resolveVarTarget', () => {
    it('should return package target and vars for package mode', () => {
      const policy = createPackageLevelPolicy();
      const result = resolveVarTarget(policy, 'package');

      expect(result.target).toEqual({ mode: 'package' });
      expect(result.vars).toEqual(policy.vars);
    });

    it('should return input target and stream vars for input mode', () => {
      const policy = createInputLevelPolicy();
      const result = resolveVarTarget(policy, 'input');

      expect(result.target).toEqual({ mode: 'input', inputIndex: 0, streamIndex: 0 });
      expect(result.vars).toEqual(policy.inputs[0].streams[0].vars);
    });

    it('should return undefined vars when no enabled input exists', () => {
      const policy = {
        ...createInputLevelPolicy(),
        inputs: [{ ...createInputLevelPolicy().inputs[0], enabled: false }],
      };
      const result = resolveVarTarget(policy, 'input');

      expect(result.target).toEqual({ mode: 'input', inputIndex: -1, streamIndex: -1 });
      expect(result.vars).toBeUndefined();
    });

    it('should return undefined vars when no enabled stream exists', () => {
      const policy = {
        ...createInputLevelPolicy(),
        inputs: [
          {
            ...createInputLevelPolicy().inputs[0],
            streams: [{ ...createInputLevelPolicy().inputs[0].streams[0], enabled: false }],
          },
        ],
      };
      const result = resolveVarTarget(policy, 'input');

      expect(result.target).toEqual({ mode: 'input', inputIndex: 0, streamIndex: -1 });
      expect(result.vars).toBeUndefined();
    });
  });

  describe('applyVarsAtTarget', () => {
    it('should apply vars at package level when target mode is package', () => {
      const policy = createPackageLevelPolicy();
      const updatedVars = {
        role_arn: { value: 'arn:aws:iam::999999999999:role/UpdatedRole' },
        external_id: { value: 'updated-external-id' },
      };

      const result = applyVarsAtTarget(policy, updatedVars, { mode: 'package' });

      expect(result.vars).toEqual(updatedVars);
      // Original should not be mutated
      expect(policy.vars?.role_arn?.value).toBe('arn:aws:iam::123456789012:role/TestRole');
    });

    it('should apply vars at stream level when target mode is input', () => {
      const policy = createInputLevelPolicy();
      const updatedVars = {
        role_arn: { value: 'arn:aws:iam::999999999999:role/UpdatedRole' },
        external_id: { value: 'updated-external-id' },
      };

      const result = applyVarsAtTarget(policy, updatedVars, {
        mode: 'input',
        inputIndex: 0,
        streamIndex: 0,
      });

      expect(result.inputs[0].streams[0].vars).toEqual(updatedVars);
      // Original should not be mutated
      expect(policy.inputs[0].streams[0].vars?.role_arn?.value).toBe(
        'arn:aws:iam::123456789012:role/TestRole'
      );
    });

    it('should return original policy when inputIndex is invalid', () => {
      const policy = createInputLevelPolicy();
      const updatedVars = { role_arn: { value: 'new-role' } };

      const result = applyVarsAtTarget(policy, updatedVars, {
        mode: 'input',
        inputIndex: -1,
        streamIndex: 0,
      });

      expect(result).toEqual(policy);
    });

    it('should return original policy when streamIndex is invalid', () => {
      const policy = createInputLevelPolicy();
      const updatedVars = { role_arn: { value: 'new-role' } };

      const result = applyVarsAtTarget(policy, updatedVars, {
        mode: 'input',
        inputIndex: 0,
        streamIndex: -1,
      });

      expect(result).toEqual(policy);
    });

    it('should preserve other inputs when updating specific stream', () => {
      const policy: NewPackagePolicy = {
        ...createInputLevelPolicy(),
        inputs: [
          {
            type: 'first-input',
            enabled: false,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'first' },
                vars: { first_var: { value: 'first-value' } },
              },
            ],
          },
          {
            type: 'second-input',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'second' },
                vars: { role_arn: { value: 'original-role' } },
              },
            ],
          },
        ],
      };
      const updatedVars = { role_arn: { value: 'updated-role' } };

      const result = applyVarsAtTarget(policy, updatedVars, {
        mode: 'input',
        inputIndex: 1,
        streamIndex: 0,
      });

      // First input should be unchanged
      expect(result.inputs[0].streams[0].vars).toEqual({ first_var: { value: 'first-value' } });
      // Second input should be updated
      expect(result.inputs[1].streams[0].vars).toEqual(updatedVars);
    });
  });

  describe('findFirstVarEntry', () => {
    it('should return the first matching var entry', () => {
      const vars = {
        role_arn: { value: 'test-role-arn' },
        other_var: { value: 'other-value' },
      };

      const result = findFirstVarEntry(vars, ['role_arn', 'aws.role_arn']);

      expect(result).toEqual({ value: 'test-role-arn' });
    });

    it('should return entry from alias when primary key does not exist', () => {
      const vars = {
        'aws.role_arn': { value: 'aliased-role-arn' },
        other_var: { value: 'other-value' },
      };

      const result = findFirstVarEntry(vars, ['role_arn', 'aws.role_arn']);

      expect(result).toEqual({ value: 'aliased-role-arn' });
    });

    it('should return undefined when no matching key exists', () => {
      const vars = {
        other_var: { value: 'other-value' },
      };

      const result = findFirstVarEntry(vars, ['role_arn', 'aws.role_arn']);

      expect(result).toBeUndefined();
    });

    it('should return undefined when vars is undefined', () => {
      const result = findFirstVarEntry(undefined, ['role_arn', 'aws.role_arn']);

      expect(result).toBeUndefined();
    });

    it('should return the first key in order when multiple keys exist', () => {
      const vars = {
        role_arn: { value: 'primary-value' },
        'aws.role_arn': { value: 'alias-value' },
      };

      const result = findFirstVarEntry(vars, ['role_arn', 'aws.role_arn']);

      expect(result).toEqual({ value: 'primary-value' });
    });
  });

  describe('getVarTarget', () => {
    it('should return package target for package mode', () => {
      const packageInfo = createPackageLevelPackageInfo();
      const policy = createPackageLevelPolicy();

      const target = getVarTarget(policy, packageInfo);

      expect(target).toEqual({ mode: 'package' });
    });

    it('should return input target for input mode', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = createInputLevelPolicy();

      const target = getVarTarget(policy, packageInfo);

      expect(target).toEqual({ mode: 'input', inputIndex: 0, streamIndex: 0 });
    });

    it('should return invalid indices when no enabled input exists', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = {
        ...createInputLevelPolicy(),
        inputs: [{ ...createInputLevelPolicy().inputs[0], enabled: false }],
      };

      const target = getVarTarget(policy, packageInfo);

      expect(target).toEqual({ mode: 'input', inputIndex: -1, streamIndex: -1 });
    });

    it('should return invalid stream index when no enabled stream exists', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = {
        ...createInputLevelPolicy(),
        inputs: [
          {
            ...createInputLevelPolicy().inputs[0],
            streams: [{ ...createInputLevelPolicy().inputs[0].streams[0], enabled: false }],
          },
        ],
      };

      const target = getVarTarget(policy, packageInfo);

      expect(target).toEqual({ mode: 'input', inputIndex: 0, streamIndex: -1 });
    });
  });

  describe('extractRawCredentialVars', () => {
    it('should extract vars from package level in package mode', () => {
      const packageInfo = createPackageLevelPackageInfo();
      const policy = createPackageLevelPolicy();

      const vars = extractRawCredentialVars(policy, packageInfo);

      expect(vars).toEqual(policy.vars);
      expect(vars?.role_arn?.value).toBe('arn:aws:iam::123456789012:role/TestRole');
    });

    it('should extract vars from stream level in input mode', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = createInputLevelPolicy();

      const vars = extractRawCredentialVars(policy, packageInfo);

      expect(vars).toEqual(policy.inputs[0].streams[0].vars);
      expect(vars?.role_arn?.value).toBe('arn:aws:iam::123456789012:role/TestRole');
    });
  });

  describe('readCredentials', () => {
    it('should read AWS credentials from package-level vars', () => {
      const packageInfo = createPackageLevelPackageInfo();
      const policy = createPackageLevelPolicy();

      const credentials = readCredentials(policy, 'aws', packageInfo);

      expect(credentials).toEqual({
        roleArn: 'arn:aws:iam::123456789012:role/TestRole',
        externalId: 'test-external-id-123',
      });
    });

    it('should read AWS credentials from input-level vars', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = createInputLevelPolicy();

      const credentials = readCredentials(policy, 'aws', packageInfo);

      expect(credentials).toEqual({
        roleArn: 'arn:aws:iam::123456789012:role/TestRole',
        externalId: 'test-external-id-123',
      });
    });

    it('should read Azure credentials from input-level vars', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = createAzureInputLevelPolicy();

      const credentials = readCredentials(policy, 'azure', packageInfo);

      expect(credentials).toEqual({
        tenantId: 'tenant-123',
        clientId: 'client-456',
        azureCredentialsCloudConnectorId: 'connector-789',
      });
    });

    it('should handle secret reference objects', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = {
        ...createInputLevelPolicy(),
        inputs: [
          {
            ...createInputLevelPolicy().inputs[0],
            streams: [
              {
                ...createInputLevelPolicy().inputs[0].streams[0],
                vars: {
                  role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole' },
                  external_id: {
                    value: { id: 'secret-123', isSecretRef: true },
                  },
                },
              },
            ],
          },
        ],
      };

      const credentials = readCredentials(policy, 'aws', packageInfo);

      expect(credentials).toEqual({
        roleArn: 'arn:aws:iam::123456789012:role/TestRole',
        externalId: { id: 'secret-123', isSecretRef: true },
      });
    });
  });

  describe('writeCredentials', () => {
    it('should write AWS credentials to package-level vars', () => {
      const packageInfo = createPackageLevelPackageInfo();
      const policy = createPackageLevelPolicy();

      const updatedPolicy = writeCredentials(
        policy,
        {
          roleArn: 'arn:aws:iam::987654321098:role/NewRole',
          externalId: 'new-external-id',
        },
        'aws',
        packageInfo
      );

      expect(updatedPolicy.vars?.role_arn?.value).toBe('arn:aws:iam::987654321098:role/NewRole');
      expect(updatedPolicy.vars?.external_id?.value).toBe('new-external-id');
      // Original should not be mutated
      expect(policy.vars?.role_arn?.value).toBe('arn:aws:iam::123456789012:role/TestRole');
    });

    it('should write AWS credentials to input-level vars', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = createInputLevelPolicy();

      const updatedPolicy = writeCredentials(
        policy,
        {
          roleArn: 'arn:aws:iam::987654321098:role/NewRole',
          externalId: 'new-external-id',
        },
        'aws',
        packageInfo
      );

      expect(updatedPolicy.inputs[0].streams[0].vars?.role_arn?.value).toBe(
        'arn:aws:iam::987654321098:role/NewRole'
      );
      expect(updatedPolicy.inputs[0].streams[0].vars?.external_id?.value).toBe('new-external-id');
      // Original should not be mutated
      expect(policy.inputs[0].streams[0].vars?.role_arn?.value).toBe(
        'arn:aws:iam::123456789012:role/TestRole'
      );
    });

    it('should write Azure credentials to input-level vars', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = createAzureInputLevelPolicy();

      const updatedPolicy = writeCredentials(
        policy,
        {
          tenantId: 'new-tenant',
          clientId: 'new-client',
          azureCredentialsCloudConnectorId: 'new-connector',
        },
        'azure',
        packageInfo
      );

      expect(updatedPolicy.inputs[0].streams[0].vars?.tenant_id?.value).toBe('new-tenant');
      expect(updatedPolicy.inputs[0].streams[0].vars?.client_id?.value).toBe('new-client');
      expect(
        updatedPolicy.inputs[0].streams[0].vars?.azure_credentials_cloud_connector_id?.value
      ).toBe('new-connector');
    });

    it('should return original policy when no vars container exists', () => {
      const packageInfo = createInputLevelPackageInfo();
      const policy = {
        ...createInputLevelPolicy(),
        inputs: [{ ...createInputLevelPolicy().inputs[0], enabled: false }],
      };

      const updatedPolicy = writeCredentials(policy, { roleArn: 'new-role' }, 'aws', packageInfo);

      expect(updatedPolicy).toEqual(policy);
    });
  });
});
