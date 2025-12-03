/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '../../types';
import { extractAccountType, normalizeAccountType } from './integration_helpers';

describe('cloud connector integration helpers', () => {
  describe('normalizeAccountType', () => {
    it('should normalize AWS single-account to single', () => {
      expect(normalizeAccountType('single-account')).toBe('single');
    });

    it('should normalize AWS organization-account to organization', () => {
      expect(normalizeAccountType('organization-account')).toBe('organization');
    });

    it('should normalize Azure single-subscription to single', () => {
      expect(normalizeAccountType('single-subscription')).toBe('single');
    });

    it('should normalize Azure organization-subscription to organization', () => {
      expect(normalizeAccountType('organization-subscription')).toBe('organization');
    });

    it('should pass through already normalized single value', () => {
      expect(normalizeAccountType('single')).toBe('single');
    });

    it('should pass through already normalized organization value', () => {
      expect(normalizeAccountType('organization')).toBe('organization');
    });

    it('should return undefined for undefined input', () => {
      expect(normalizeAccountType(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(normalizeAccountType('')).toBeUndefined();
    });

    it('should return undefined for unrecognized values', () => {
      expect(normalizeAccountType('unknown-type')).toBeUndefined();
      expect(normalizeAccountType('other')).toBeUndefined();
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
      it('should extract and normalize AWS single-account', () => {
        const packagePolicy = createMockPackagePolicy({
          'aws.account_type': { value: 'single-account' },
        });

        expect(extractAccountType('aws', packagePolicy)).toBe('single');
      });

      it('should extract and normalize AWS organization-account', () => {
        const packagePolicy = createMockPackagePolicy({
          'aws.account_type': { value: 'organization-account' },
        });

        expect(extractAccountType('aws', packagePolicy)).toBe('organization');
      });

      it('should return undefined when aws.account_type is not present', () => {
        const packagePolicy = createMockPackagePolicy({});

        expect(extractAccountType('aws', packagePolicy)).toBeUndefined();
      });
    });

    describe('Azure account type extraction', () => {
      it('should extract and normalize Azure single-subscription', () => {
        const packagePolicy = createMockPackagePolicy({
          'azure.account_type': { value: 'single-subscription' },
        });

        expect(extractAccountType('azure', packagePolicy)).toBe('single');
      });

      it('should extract and normalize Azure organization-subscription', () => {
        const packagePolicy = createMockPackagePolicy({
          'azure.account_type': { value: 'organization-subscription' },
        });

        expect(extractAccountType('azure', packagePolicy)).toBe('organization');
      });

      it('should return undefined when azure.account_type is not present', () => {
        const packagePolicy = createMockPackagePolicy({});

        expect(extractAccountType('azure', packagePolicy)).toBeUndefined();
      });
    });

    describe('GCP account type extraction', () => {
      it('should return undefined for GCP (not yet supported)', () => {
        const packagePolicy = createMockPackagePolicy({
          'gcp.account_type': { value: 'single-project' },
        });

        expect(extractAccountType('gcp', packagePolicy)).toBeUndefined();
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

        expect(extractAccountType('aws', packagePolicy)).toBeUndefined();
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
                  vars: { 'aws.account_type': { value: 'single-account' } },
                },
              ],
            },
          ],
        };

        expect(extractAccountType('aws', packagePolicy)).toBeUndefined();
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

        expect(extractAccountType('aws', packagePolicy)).toBeUndefined();
      });
    });
  });
});

