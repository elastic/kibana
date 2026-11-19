/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackageInfo } from '../../types';
import type { PackagePolicyConfigRecord } from '../../../common/types';

import {
  SINGLE_ACCOUNT,
  ORGANIZATION_ACCOUNT,
  CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE,
} from '../../../common/constants/cloud_connector';

import {
  extractAccountType,
  validateAccountType,
  injectConnectorVarsIntoPolicy,
} from './integration_helpers';

// Mock PackageInfo for input-level storage mode (no package-level vars defined)
const mockPackageInfo = {
  name: 'test-package',
  title: 'Test Package',
  version: '1.0.0',
  description: 'Test package',
  type: 'integration',
  categories: [],
  conditions: {},
  icons: [],
  assets: {
    kibana: undefined,
    elasticsearch: undefined,
  },
  policy_templates: [],
  data_streams: [],
  owner: { github: 'elastic' },
  screenshots: [],
} as unknown as PackageInfo;

describe('cloud connector integration helpers', () => {
  describe('validateAccountType', () => {
    it('should validate and return single-account', () => {
      expect(validateAccountType(SINGLE_ACCOUNT)).toBe(SINGLE_ACCOUNT);
    });

    it('should validate and return organization-account', () => {
      expect(validateAccountType(ORGANIZATION_ACCOUNT)).toBe(ORGANIZATION_ACCOUNT);
    });

    it('should return undefined for undefined input', () => {
      expect(validateAccountType(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(validateAccountType('')).toBeUndefined();
    });

    it('should return undefined for unrecognized values', () => {
      expect(validateAccountType('unknown-type')).toBeUndefined();
      expect(validateAccountType('other')).toBeUndefined();
      expect(validateAccountType('single')).toBeUndefined();
      expect(validateAccountType('organization')).toBeUndefined();
      expect(validateAccountType('single-subscription')).toBeUndefined();
      expect(validateAccountType('organization-subscription')).toBeUndefined();
    });
  });

  describe('extractAccountType', () => {
    const createMockPackagePolicy = (
      vars: Record<string, { value: string }>
    ): NewPackagePolicy => ({
      name: 'test-policy',
      namespace: 'default',
      policy_ids: [],
      enabled: true,
      inputs: [
        {
          type: 'test-input',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'test' },
              vars,
            },
          ],
        },
      ],
    });

    describe('AWS account type extraction', () => {
      it('should extract and validate AWS single-account', () => {
        const packagePolicy = createMockPackagePolicy({
          'aws.account_type': { value: SINGLE_ACCOUNT },
        });

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBe(SINGLE_ACCOUNT);
      });

      it('should extract and validate AWS organization-account', () => {
        const packagePolicy = createMockPackagePolicy({
          'aws.account_type': { value: ORGANIZATION_ACCOUNT },
        });

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBe(
          ORGANIZATION_ACCOUNT
        );
      });

      it('should default to single-account when aws.account_type is not present', () => {
        const packagePolicy = createMockPackagePolicy({});

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBe(
          CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE
        );
      });
    });

    describe('Azure account type extraction', () => {
      it('should extract and validate Azure single-account', () => {
        const packagePolicy = createMockPackagePolicy({
          'azure.account_type': { value: SINGLE_ACCOUNT },
        });

        expect(extractAccountType('azure', packagePolicy, mockPackageInfo)).toBe(SINGLE_ACCOUNT);
      });

      it('should extract and validate Azure organization-account', () => {
        const packagePolicy = createMockPackagePolicy({
          'azure.account_type': { value: ORGANIZATION_ACCOUNT },
        });

        expect(extractAccountType('azure', packagePolicy, mockPackageInfo)).toBe(
          ORGANIZATION_ACCOUNT
        );
      });

      it('should default to single-account when azure.account_type is not present', () => {
        const packagePolicy = createMockPackagePolicy({});

        expect(extractAccountType('azure', packagePolicy, mockPackageInfo)).toBe(
          CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE
        );
      });
    });

    describe('GCP account type extraction', () => {
      it('should extract and validate GCP single-account', () => {
        const packagePolicy = createMockPackagePolicy({
          'gcp.account_type': { value: SINGLE_ACCOUNT },
        });

        expect(extractAccountType('gcp', packagePolicy, mockPackageInfo)).toBe(SINGLE_ACCOUNT);
      });

      it('should extract and validate GCP organization-account', () => {
        const packagePolicy = createMockPackagePolicy({
          'gcp.account_type': { value: ORGANIZATION_ACCOUNT },
        });

        expect(extractAccountType('gcp', packagePolicy, mockPackageInfo)).toBe(
          ORGANIZATION_ACCOUNT
        );
      });

      it('should default to single-account when gcp.account_type is not present', () => {
        const packagePolicy = createMockPackagePolicy({});

        expect(extractAccountType('gcp', packagePolicy, mockPackageInfo)).toBe(
          CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE
        );
      });
    });

    describe('edge cases', () => {
      it('should default to single-account when inputs are empty', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          policy_ids: [],
          enabled: true,
          inputs: [],
        };

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBe(
          CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE
        );
      });

      it('should default to single-account when no enabled input exists', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          policy_ids: [],
          enabled: true,
          inputs: [
            {
              type: 'test-input',
              enabled: false,
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'test' },
                  vars: { 'aws.account_type': { value: SINGLE_ACCOUNT } },
                },
              ],
            },
          ],
        };

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBe(
          CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE
        );
      });

      it('should default to single-account when streams have no vars', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          policy_ids: [],
          enabled: true,
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
        };

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBe(
          CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE
        );
      });
    });
  });

  describe('injectConnectorVarsIntoPolicy', () => {
    // input-mode policy: credentials live in stream vars
    const makeInputPolicy = (streamVars: PackagePolicyConfigRecord = {}): NewPackagePolicy => ({
      name: 'test-policy',
      namespace: 'default',
      policy_ids: [],
      enabled: true,
      inputs: [
        {
          type: 'aws/metrics',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'metrics', dataset: 'aws.s3' },
              vars: streamVars,
            },
          ],
        },
      ],
    });

    const awsConnectorVars = {
      role_arn: { type: 'text' as const, value: 'arn:aws:iam::123:role/elastic' },
    };

    it('backfills role_arn into stream vars when entry exists with no value', () => {
      // varsReducer always creates an entry object; empty var has value: undefined
      const policy = makeInputPolicy({ role_arn: { type: 'text' as const, value: undefined } });
      const result = injectConnectorVarsIntoPolicy(
        policy,
        awsConnectorVars,
        'aws',
        mockPackageInfo
      );
      expect(result.inputs[0].streams[0].vars?.role_arn).toEqual(awsConnectorVars.role_arn);
    });

    it('does not overwrite role_arn already present in stream vars', () => {
      const existing = { type: 'text' as const, value: 'arn:aws:iam::456:role/existing' };
      const policy = makeInputPolicy({ role_arn: existing });
      const result = injectConnectorVarsIntoPolicy(
        policy,
        awsConnectorVars,
        'aws',
        mockPackageInfo
      );
      expect(result.inputs[0].streams[0].vars?.role_arn).toEqual(existing);
    });

    it('returns policy unchanged when role_arn key is absent from stream vars', () => {
      const policy = makeInputPolicy({});
      const result = injectConnectorVarsIntoPolicy(
        policy,
        awsConnectorVars,
        'aws',
        mockPackageInfo
      );
      expect(result.inputs[0].streams[0].vars).toEqual({});
    });

    it('returns policy unchanged when no enabled input exists', () => {
      const policy: NewPackagePolicy = { ...makeInputPolicy(), inputs: [] };
      const result = injectConnectorVarsIntoPolicy(
        policy,
        awsConnectorVars,
        'aws',
        mockPackageInfo
      );
      expect(result).toEqual(policy);
    });

    // TODO: extend later for other providers
    it('is a no-op for non-AWS providers', () => {
      const azureVars = {
        tenant_id: { type: 'password' as const, value: { id: 'secret-1', isSecretRef: true } },
      } as any;
      const policy = makeInputPolicy({ tenant_id: { type: 'text' as const, value: undefined } });
      const result = injectConnectorVarsIntoPolicy(policy, azureVars, 'azure', mockPackageInfo);
      expect(result.inputs[0].streams[0].vars?.tenant_id?.value).toBeUndefined();
    });

    describe('identity-federation flag', () => {
      it('sets supports_cloud_connectors to true when the var exists in stream vars', () => {
        const policy = makeInputPolicy({
          role_arn: { type: 'text' as const, value: undefined },
          supports_cloud_connectors: { type: 'bool' as const, value: false },
        });
        const result = injectConnectorVarsIntoPolicy(
          policy,
          awsConnectorVars,
          'aws',
          mockPackageInfo
        );
        expect(result.inputs[0].streams[0].vars?.supports_cloud_connectors?.value).toBe(true);
      });

      it('sets supports_identity_federation to true when the renamed var exists', () => {
        const policy = makeInputPolicy({
          role_arn: { type: 'text' as const, value: undefined },
          supports_identity_federation: { type: 'bool' as const, value: false },
        });
        const result = injectConnectorVarsIntoPolicy(
          policy,
          awsConnectorVars,
          'aws',
          mockPackageInfo
        );
        expect(result.inputs[0].streams[0].vars?.supports_identity_federation?.value).toBe(true);
      });

      it('sets both flag names when both are present', () => {
        const policy = makeInputPolicy({
          role_arn: { type: 'text' as const, value: undefined },
          supports_cloud_connectors: { type: 'bool' as const, value: false },
          supports_identity_federation: { type: 'bool' as const, value: false },
        });
        const result = injectConnectorVarsIntoPolicy(
          policy,
          awsConnectorVars,
          'aws',
          mockPackageInfo
        );
        expect(result.inputs[0].streams[0].vars?.supports_cloud_connectors?.value).toBe(true);
        expect(result.inputs[0].streams[0].vars?.supports_identity_federation?.value).toBe(true);
      });

      it('does not add a flag var that the package did not declare', () => {
        const policy = makeInputPolicy({ role_arn: { type: 'text' as const, value: undefined } });
        const result = injectConnectorVarsIntoPolicy(
          policy,
          awsConnectorVars,
          'aws',
          mockPackageInfo
        );
        expect('supports_cloud_connectors' in (result.inputs[0].streams[0].vars ?? {})).toBe(false);
        expect('supports_identity_federation' in (result.inputs[0].streams[0].vars ?? {})).toBe(
          false
        );
      });

      it('sets the flag for non-AWS providers too', () => {
        const azureVars = { tenant_id: { type: 'text' as const, value: undefined } } as any;
        const policy = makeInputPolicy({
          supports_cloud_connectors: { type: 'bool' as const, value: false },
        });
        const result = injectConnectorVarsIntoPolicy(policy, azureVars, 'azure', mockPackageInfo);
        expect(result.inputs[0].streams[0].vars?.supports_cloud_connectors?.value).toBe(true);
      });

      it('overwrites an existing false value (not gated by empty-value guard)', () => {
        const policy = makeInputPolicy({
          supports_cloud_connectors: { type: 'bool' as const, value: false },
        });
        const result = injectConnectorVarsIntoPolicy(
          policy,
          awsConnectorVars,
          'aws',
          mockPackageInfo
        );
        expect(result.inputs[0].streams[0].vars?.supports_cloud_connectors?.value).toBe(true);
      });
    });
  });
});
