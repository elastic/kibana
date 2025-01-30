/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringType } from '../../../../../../../../../../common/types';

export const mockAgentPolicy = {
  id: '888c9a80-cae6-4675-82ad-73553cb343f9',
  name: 'Agent policy 1',
  description: '',
  namespace: 'default',
  monitoring_enabled: ['logs', 'metrics', 'traces'] as MonitoringType,
  inactivity_timeout: 1209600,
  is_protected: false,
  status: 'active' as const, // or 'Inactive' as const
  is_managed: false,
  revision: 1,
  updated_at: '2025-01-29T14:12:36.256Z',
  updated_by: 'elastic',
  schema_version: '1.1.1',
};

export const mockPackagePolicy = {
  id: '5811fb40-82e4-4808-b94e-5e02158936c7',
  version: 'WzgyMSwxXQ==',
  name: 'cspm-1',
  namespace: 'default',
  description: '',
  package: {
    name: 'cloud_security_posture',
    title: 'Security Posture Management',
    version: '1.12.0',
  },
  enabled: true,
  policy_id: '888c9a80-cae6-4675-82ad-73553cb343f9',
  policy_ids: ['888c9a80-cae6-4675-82ad-73553cb343f9'],
  inputs: [
    {
      type: 'cloudbeat/cis_k8s',
      policy_template: 'kspm',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'logs',
            dataset: 'cloud_security_posture.findings',
          },
          vars: {
            condition: {
              type: 'text',
            },
          },
          id: 'cloudbeat/cis_k8s-cloud_security_posture.findings-5811fb40-82e4-4808-b94e-5e02158936c7',
        },
      ],
    },
    {
      type: 'cloudbeat/cis_eks',
      policy_template: 'kspm',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'logs',
            dataset: 'cloud_security_posture.findings',
          },
          vars: {
            condition: { type: 'text' },
            access_key_id: { type: 'text' },
            secret_access_key: { type: 'password' },
            session_token: { type: 'text' },
            shared_credential_file: { type: 'text' },
            credential_profile_name: { type: 'text' },
            role_arn: { type: 'text' },
            aws_credentials_type: { type: 'text' },
          },
          id: 'cloudbeat/cis_eks-cloud_security_posture.findings-5811fb40-82e4-4808-b94e-5e02158936c7',
        },
      ],
    },
    {
      type: 'cloudbeat/cis_aws',
      policy_template: 'cspm',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'logs',
            dataset: 'cloud_security_posture.findings',
          },
          vars: {
            condition: { type: 'text' },
            access_key_id: { type: 'text' },
            secret_access_key: { type: 'password' },
            session_token: { type: 'text' },
            shared_credential_file: { type: 'text' },
            credential_profile_name: { type: 'text' },
            role_arn: { type: 'text' },
            aws_credentials_type: { value: 'cloud_formation', type: 'text' },
            aws_account_type: { value: 'organization-account', type: 'text' },
            aws_supports_cloud_connectors: { type: 'bool' },
          },
          id: 'cloudbeat/cis_aws-cloud_security_posture.findings-5811fb40-82e4-4808-b94e-5e02158936c7',
          compiled_stream: {
            period: '24h',
            fetchers: [
              { name: 'aws-iam' },
              { name: 'aws-ec2-network' },
              { name: 'aws-s3' },
              { name: 'aws-trail' },
              { name: 'aws-monitoring' },
              { name: 'aws-rds' },
            ],
            config: {
              v1: {
                type: 'cspm',
                deployment: 'aws',
                benchmark: 'cis_aws',
                aws: {
                  account_type: 'organization-account',
                  credentials: {
                    type: 'cloud_formation',
                  },
                },
              },
            },
          },
        },
      ],
      vars: {
        cloud_formation_template: {
          value:
            'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-ACCOUNT_TYPE-8.17.0.yml&stackName=Elastic-Cloud-Security-Posture-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
          type: 'text',
        },
      },
      config: {
        cloud_formation_template_url: {
          value:
            'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-ACCOUNT_TYPE-8.17.0.yml&stackName=Elastic-Cloud-Security-Posture-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
        },
      },
    },
  ],
  vars: {
    posture: { value: 'cspm', type: 'text' },
    deployment: { value: 'aws', type: 'text' },
  },
  revision: 1,
  created_at: '2025-01-29T14:12:41.393Z',
  created_by: 'system',
  updated_at: '2025-01-29T14:12:41.393Z',
  updated_by: 'system',
};
