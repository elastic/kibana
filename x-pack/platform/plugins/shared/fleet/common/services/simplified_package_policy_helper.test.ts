/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackageInfo } from '../../server/types';

import nginxPackageInfo from '../../server/services/package_policies/fixtures/package_info/nginx_1.5.0.json';

import {
  simplifiedPackagePolicytoNewPackagePolicy,
  packagePolicyToSimplifiedPackagePolicy,
  generateInputId,
} from './simplified_package_policy_helper';

function getEnabledInputsAndStreams(newPackagePolicy: NewPackagePolicy) {
  return newPackagePolicy.inputs
    .filter((input) => input.enabled)
    .reduce((acc, input) => {
      const inputId = generateInputId(input);

      acc[inputId] = input.streams
        .filter((stream) => stream.enabled)
        .map((stream) => stream.data_stream.dataset);

      return acc;
    }, {} as Record<string, string[]>);
}

describe('toPackagePolicy', () => {
  describe('With nginx package', () => {
    it('should work', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          supports_cloud_connector: undefined,
          cloud_connector_id: undefined,
          output_id: 'output123',
          description: 'Test description',
          inputs: {
            'nginx-logfile': {
              streams: {
                'nginx.error': {
                  vars: {
                    tags: ['test', 'nginx-error'],
                  },
                },
              },
            },
            'nginx-nginx/metrics': {},
          },
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(res).toMatchSnapshot();
    });

    it('should enable default inputs streams', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(getEnabledInputsAndStreams(res)).toEqual({
        'nginx-logfile': ['nginx.access', 'nginx.error'],
        'nginx-nginx/metrics': ['nginx.stubstatus'],
      });
    });

    it('should allow user to disable inputs', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          inputs: {
            'nginx-logfile': { enabled: false },
          },
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(getEnabledInputsAndStreams(res)).toEqual({
        'nginx-nginx/metrics': ['nginx.stubstatus'],
      });
    });

    it('should allow user to disable streams', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          inputs: {
            'nginx-logfile': {
              streams: {
                'nginx.error': { enabled: false },
              },
            },
          },
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(getEnabledInputsAndStreams(res)).toEqual({
        'nginx-logfile': ['nginx.access'],
        'nginx-nginx/metrics': ['nginx.stubstatus'],
      });
    });

    it('should to pass experimental_data_stream_features', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
        },
        nginxPackageInfo as unknown as PackageInfo,
        {
          experimental_data_stream_features: [
            {
              data_stream: 'logs-nginx.access',
              features: {
                synthetic_source: true,
                tsdb: false,
                doc_value_only_numeric: false,
                doc_value_only_other: false,
              },
            },
          ],
        }
      );

      expect(res.package?.experimental_data_stream_features).toEqual([
        {
          data_stream: 'logs-nginx.access',
          features: {
            synthetic_source: true,
            tsdb: false,
            doc_value_only_numeric: false,
            doc_value_only_other: false,
          },
        },
      ]);
    });

    it('should to pass additional_datastreams_permissions', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          additional_datastreams_permissions: ['logs-test-123'],
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(res.additional_datastreams_permissions).toEqual(['logs-test-123']);
    });

    it('should preserve var_group_selections when creating package policy', () => {
      const varGroupSelections = { auth_method: 'api_key' };
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          var_group_selections: varGroupSelections,
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(res.var_group_selections).toEqual(varGroupSelections);
    });

    it('should include var_group_selections when converting back to simplified policy', () => {
      const varGroupSelections = { auth_method: 'api_key' };
      const packagePolicy = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          var_group_selections: varGroupSelections,
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      const simplified = packagePolicyToSimplifiedPackagePolicy(packagePolicy as any);

      expect((simplified as any).var_group_selections).toEqual(varGroupSelections);
    });
  });
});
