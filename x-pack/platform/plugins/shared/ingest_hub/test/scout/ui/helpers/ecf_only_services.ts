/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { mockAwsPackage, mockPackage } from './onboarding';

// `waf_otel`, `cloudtrail_otel` and `vpcflow_otel` are ECF-only: they alias an ECS policy template
// of the `aws` package and have no agent-based route. `ec2_otel` comes from the composable `aws_otel`
// package, which supports managed integrations and agent-based. All of them are in the OTel data format.

const aliasedTemplate = (name: string, title: string) => ({
  name,
  title,
  data_streams: [name],
  inputs: [{ type: 'aws-s3' }],
});

const aliasedDataStream = (path: string) => ({
  path,
  type: 'logs',
  streams: [
    {
      input: 'aws-s3',
      vars: [{ name: 'bucket_arn', type: 'text', title: 'Bucket ARN', required: true }],
    },
  ],
});

export const MOCK_AWS_PACKAGE_ECF_ONLY_ALIASES = {
  item: {
    version: '7.1.1',
    policy_templates: [
      aliasedTemplate('cloudtrail', 'AWS CloudTrail'),
      aliasedTemplate('vpcflow', 'AWS VPC Flow Logs'),
      aliasedTemplate('waf', 'AWS WAF'),
    ],
    data_streams: [
      aliasedDataStream('cloudtrail'),
      aliasedDataStream('vpcflow'),
      aliasedDataStream('waf'),
    ],
  },
};

// aws_otel is a composable integration: one `aws` policy template with a data stream per service.
export const MOCK_AWS_OTEL_PACKAGE = {
  item: {
    version: '0.1.0',
    policy_templates: [
      {
        name: 'aws',
        title: 'AWS metrics',
        data_streams: ['ec2'],
        inputs: [{ type: 'otelcol', title: 'AWS CloudWatch', vars: [] }],
        deployment_modes: { agentless: { enabled: true } },
      },
    ],
    data_streams: [
      {
        path: 'ec2',
        type: 'metrics',
        dataset: 'aws.ec2',
        title: 'AWS EC2 Metrics',
        streams: [
          {
            input: 'otelcol',
            title: 'AWS EC2 Metrics',
            vars: [{ name: 'period', type: 'text', title: 'Period', required: false }],
          },
        ],
      },
    ],
  },
};

/** Serves both manifests, so the specs don't download the packages from the public registry. */
export async function mockEcfOnlyServicePackages(page: ScoutPage): Promise<void> {
  await mockAwsPackage(page, MOCK_AWS_PACKAGE_ECF_ONLY_ALIASES);
  await mockPackage(page, 'aws_otel', MOCK_AWS_OTEL_PACKAGE);
}

/** Keeps the ECF section from fetching the template version from S3. */
export async function mockEcfTemplateVersion(page: ScoutPage): Promise<void> {
  await page.route(
    (url) => /\/internal\/onboarding\/ecf\/latest_version$/.test(url.pathname),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: '1.10.0', source: 'remote' }),
      })
  );
}
