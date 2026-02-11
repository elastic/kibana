/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackageInfo } from '../../types';

import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../common/constants/cloud_connector';

import { extractAccountType, validateAccountType } from './integration_helpers';

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

      it('should return undefined when aws.account_type is not present', () => {
        const packagePolicy = createMockPackagePolicy({});

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBeUndefined();
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

      it('should return undefined when azure.account_type is not present', () => {
        const packagePolicy = createMockPackagePolicy({});

        expect(extractAccountType('azure', packagePolicy, mockPackageInfo)).toBeUndefined();
      });
    });

    describe('GCP account type extraction', () => {
      it('should return undefined for GCP (not yet supported)', () => {
        const packagePolicy = createMockPackagePolicy({
          'gcp.account_type': { value: 'single-project' },
        });

        expect(extractAccountType('gcp', packagePolicy, mockPackageInfo)).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should return undefined when inputs are empty', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'test-policy',
          namespace: 'default',
          policy_ids: [],
          enabled: true,
          inputs: [],
        };

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBeUndefined();
      });

      it('should return undefined when no enabled input exists', () => {
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

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBeUndefined();
      });

      it('should return undefined when streams have no vars', () => {
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

        expect(extractAccountType('aws', packagePolicy, mockPackageInfo)).toBeUndefined();
      });
    });
  });
});
