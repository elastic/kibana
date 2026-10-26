/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackageInfo } from '../../../../common';

export const getMockPolicyAWS = (): NewPackagePolicy => ({
  id: 'test-policy-id',
  name: 'test-policy',
  namespace: 'default',
  enabled: true,
  policy_id: 'test-policy-id',
  policy_ids: ['test-policy-id'],
  package: {
    name: 'cloud_security_posture',
    title: 'Cloud Security Posture',
    version: '1.0.0',
  },
  inputs: [
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
            'aws.account_type': { value: 'single-account', type: 'text' },
            'aws.credentials.type': { value: 'cloud_connectors', type: 'text' },
          },
        },
      ],
    },
  ],
});

export const getMockPackageInfoAWS = (): PackageInfo =>
  ({
    name: 'cloud_security_posture',
    version: '1.0.0',
    title: 'Cloud Security Posture',
    description: 'Test package',
    type: 'integration',
    categories: [],
    conditions: {},
    screenshots: [],
    icons: [],
    assets: {},
    policy_templates: [
      {
        name: 'cspm',
        title: 'CSPM',
        description: 'CSPM',
        inputs: [
          {
            type: 'cloudbeat/cis_aws',
            title: 'AWS CIS',
            description: 'AWS CIS compliance monitoring',
            vars: [
              {
                name: 'role_arn',
                type: 'text',
                title: 'Role ARN',
                multi: false,
                required: true,
                show_user: true,
              },
              {
                name: 'external_id',
                type: 'text',
                title: 'External ID',
                multi: false,
                required: true,
                show_user: true,
                secret: true,
              },
            ],
          },
        ],
      },
    ],
    data_streams: [
      {
        type: 'logs',
        dataset: 'cloud_security_posture.findings',
        title: 'Cloud Security Posture Findings',
        release: 'ga',
        package: 'cloud_security_posture',
        path: 'findings',
        ingest_pipeline: 'default',
        streams: [
          {
            input: 'cloudbeat/cis_aws',
            title: 'AWS CIS',
            description: 'AWS CIS compliance monitoring',
            enabled: true,
            vars: [
              {
                name: 'role_arn',
                type: 'text',
                title: 'Role ARN',
                multi: false,
                required: true,
                show_user: true,
              },
              {
                name: 'external_id',
                type: 'text',
                title: 'External ID',
                multi: false,
                required: true,
                show_user: true,
                secret: true,
              },
            ],
          },
        ],
      },
    ],
    owner: { github: 'elastic/security' },
  } as unknown as PackageInfo);
