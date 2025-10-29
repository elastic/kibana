/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '../../../../types';

import { extractCloudConnectorVars, shouldUseCloudConnectorAPI } from './cloud_connector';

describe('cloud_connector utils', () => {
  describe('extractCloudConnectorVars', () => {
    describe('AWS cloud connector', () => {
      it('should extract AWS cloud connector vars from input vars', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test AWS Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              streams: [],
              vars: {
                role_arn: {
                  type: 'text',
                  value: 'arn:aws:iam::123456789012:role/TestRole',
                },
                external_id: {
                  type: 'password',
                  value: 'ABCD1234567890EFGHIJ',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toEqual({
          name: 'Test AWS Policy Cloud Connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              type: 'text',
              value: 'arn:aws:iam::123456789012:role/TestRole',
            },
            external_id: {
              type: 'password',
              value: 'ABCD1234567890EFGHIJ',
            },
          },
        });
      });

      it('should extract AWS cloud connector vars from stream vars', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test AWS Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: { dataset: 'test', type: 'logs' },
                  vars: {
                    role_arn: {
                      type: 'text',
                      value: 'arn:aws:iam::123456789012:role/StreamRole',
                    },
                    external_id: {
                      type: 'password',
                      value: 'STREAM1234567890ABCD',
                    },
                  },
                },
              ],
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).not.toBeNull();
        expect(result?.cloudProvider).toBe('aws');
        expect(result?.vars.role_arn.value).toBe('arn:aws:iam::123456789012:role/StreamRole');
        expect(result?.vars.external_id.value).toBe('STREAM1234567890ABCD');
      });

      it('should extract AWS cloud connector vars with namespaced external_id', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test AWS Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: { dataset: 'test', type: 'logs' },
                  vars: {
                    role_arn: {
                      type: 'text',
                      value: 'arn:aws:iam::123456789012:role/NamespacedRole',
                    },
                    'aws.credentials.external_id': {
                      type: 'password',
                      value: 'NAMESPACED1234567890',
                    },
                  },
                },
              ],
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toEqual({
          name: 'Test AWS Policy Cloud Connector',
          cloudProvider: 'aws',
          vars: {
            role_arn: {
              type: 'text',
              value: 'arn:aws:iam::123456789012:role/NamespacedRole',
            },
            external_id: {
              type: 'password',
              value: 'NAMESPACED1234567890',
            },
          },
        });
      });

      it('should return null when AWS role_arn is missing', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test AWS Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              streams: [],
              vars: {
                external_id: {
                  type: 'password',
                  value: 'ABCD1234567890EFGHIJ',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });

      it('should return null when AWS external_id is missing', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test AWS Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              streams: [],
              vars: {
                role_arn: {
                  type: 'text',
                  value: 'arn:aws:iam::123456789012:role/TestRole',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });

      it('should handle nested value structure for AWS vars', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test AWS Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              streams: [],
              vars: {
                role_arn: {
                  type: 'text',
                  value: { value: 'arn:aws:iam::123456789012:role/NestedRole' },
                },
                external_id: {
                  type: 'password',
                  value: { value: 'NESTED1234567890ABCD' },
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).not.toBeNull();
        expect(result?.vars.role_arn.value).toBe('arn:aws:iam::123456789012:role/NestedRole');
        expect(result?.vars.external_id.value).toBe('NESTED1234567890ABCD');
      });
    });

    describe('Azure cloud connector', () => {
      it('should extract Azure cloud connector vars from input vars', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test Azure Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_azure',
              enabled: true,
              streams: [],
              vars: {
                tenant_id: {
                  type: 'password',
                  value: 'test-tenant-id-12345',
                },
                client_id: {
                  type: 'password',
                  value: 'test-client-id-12345',
                },
                azure_credentials_cloud_connector_id: {
                  type: 'text',
                  value: 'creds-connector-id',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toEqual({
          name: 'Test Azure Policy Cloud Connector',
          cloudProvider: 'azure',
          vars: {
            tenant_id: {
              type: 'password',
              value: 'test-tenant-id-12345',
            },
            client_id: {
              type: 'password',
              value: 'test-client-id-12345',
            },
            azure_credentials_cloud_connector_id: {
              type: 'text',
              value: 'creds-connector-id',
            },
          },
        });
      });

      it('should return null when Azure tenant_id is missing', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test Azure Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_azure',
              enabled: true,
              streams: [],
              vars: {
                client_id: {
                  type: 'password',
                  value: 'test-client-id',
                },
                azure_credentials_cloud_connector_id: {
                  type: 'text',
                  value: 'creds-connector-id',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });

      it('should return null when Azure client_id is missing', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test Azure Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_azure',
              enabled: true,
              streams: [],
              vars: {
                tenant_id: {
                  type: 'password',
                  value: 'test-tenant-id',
                },
                azure_credentials_cloud_connector_id: {
                  type: 'text',
                  value: 'creds-connector-id',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });

      it('should return null when Azure azure_credentials_cloud_connector_id is missing', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test Azure Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_azure',
              enabled: true,
              streams: [],
              vars: {
                tenant_id: {
                  type: 'password',
                  value: 'test-tenant-id',
                },
                client_id: {
                  type: 'password',
                  value: 'test-client-id',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should return null when supports_cloud_connector is false', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: false,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              streams: [],
              vars: {
                role_arn: {
                  type: 'text',
                  value: 'arn:aws:iam::123456789012:role/TestRole',
                },
                external_id: {
                  type: 'password',
                  value: 'ABCD1234567890EFGHIJ',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });

      it('should return null when no inputs are enabled', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: false,
              streams: [],
              vars: {
                role_arn: {
                  type: 'text',
                  value: 'arn:aws:iam::123456789012:role/TestRole',
                },
                external_id: {
                  type: 'password',
                  value: 'ABCD1234567890EFGHIJ',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });

      it('should return null when inputs array is empty', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });

      it('should return null for GCP provider (not yet implemented)', () => {
        const packagePolicy: NewPackagePolicy = {
          name: 'Test GCP Policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_gcp',
              enabled: true,
              streams: [],
              vars: {},
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result).toBeNull();
      });

      it('should handle package policy with no name', () => {
        const packagePolicy: NewPackagePolicy = {
          name: '',
          namespace: 'default',
          enabled: true,
          policy_ids: [],
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'cloudbeat/cis_aws',
              enabled: true,
              streams: [],
              vars: {
                role_arn: {
                  type: 'text',
                  value: 'arn:aws:iam::123456789012:role/TestRole',
                },
                external_id: {
                  type: 'password',
                  value: 'ABCD1234567890EFGHIJ',
                },
              },
            },
          ],
        };

        const result = extractCloudConnectorVars(packagePolicy);

        expect(result?.name).toBe('Unnamed Cloud Connector');
      });
    });
  });

  describe('shouldUseCloudConnectorAPI', () => {
    const basePackagePolicy: NewPackagePolicy = {
      name: 'Test Policy',
      namespace: 'default',
      enabled: true,
      policy_ids: [],
      supports_cloud_connector: true,
      supports_agentless: true,
      inputs: [],
    };

    it('should return true when all conditions are met', () => {
      const result = shouldUseCloudConnectorAPI(basePackagePolicy, 'new', false);

      expect(result).toBe(true);
    });

    it('should return false when supports_cloud_connector is false', () => {
      const packagePolicy = {
        ...basePackagePolicy,
        supports_cloud_connector: false,
      };

      const result = shouldUseCloudConnectorAPI(packagePolicy, 'new', false);

      expect(result).toBe(false);
    });

    it('should return false when supports_agentless is false', () => {
      const packagePolicy = {
        ...basePackagePolicy,
        supports_agentless: false,
      };

      const result = shouldUseCloudConnectorAPI(packagePolicy, 'new', false);

      expect(result).toBe(false);
    });

    it('should return false when selectedPolicyTab is not "new"', () => {
      const result = shouldUseCloudConnectorAPI(basePackagePolicy, 'existing', false);

      expect(result).toBe(false);
    });

    it('should return false when hasExistingConnector is true', () => {
      const result = shouldUseCloudConnectorAPI(basePackagePolicy, 'new', true);

      expect(result).toBe(false);
    });

    it('should return false when cloud_connector_id is already set', () => {
      const packagePolicy = {
        ...basePackagePolicy,
        cloud_connector_id: 'existing-connector-id',
      };

      const result = shouldUseCloudConnectorAPI(packagePolicy, 'new', false);

      expect(result).toBe(false);
    });

    it('should return false when supports_cloud_connector is undefined', () => {
      const packagePolicy = {
        ...basePackagePolicy,
        supports_cloud_connector: undefined,
      };

      const result = shouldUseCloudConnectorAPI(packagePolicy, 'new', false);

      expect(result).toBe(false);
    });

    it('should return false when supports_agentless is null', () => {
      const packagePolicy = {
        ...basePackagePolicy,
        supports_agentless: null,
      };

      const result = shouldUseCloudConnectorAPI(packagePolicy, 'new', false);

      expect(result).toBe(false);
    });

    it('should handle all false conditions', () => {
      const packagePolicy = {
        ...basePackagePolicy,
        supports_cloud_connector: false,
        supports_agentless: false,
        cloud_connector_id: 'existing-id',
      };

      const result = shouldUseCloudConnectorAPI(packagePolicy, 'existing', true);

      expect(result).toBe(false);
    });
  });
});
