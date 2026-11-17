/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

import type { PackageInfo } from '../../../common/types';

export const createStepContext = <Input>(input: Input): StepHandlerContext<any, any> =>
  ({
    config: {},
    input,
    rawInput: input,
    contextManager: {
      getContext: jest.fn(() => ({})),
      getFakeRequest: jest.fn(() => ({})),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'fleet.test',
  } as unknown as StepHandlerContext<any, any>);

const logDataStream = (path: string, dataset: string, type: 'logs' | 'metrics' = 'logs') => ({
  path,
  type,
  dataset,
  title: path,
  streams: [
    {
      input: 'aws-s3',
      enabled: true,
      // As in the aws package: two optional sources, of which one is needed.
      vars: [
        { name: 'bucket_arn', title: 'Bucket ARN', type: 'text', show_user: true },
        { name: 'queue_url', title: 'Queue URL', type: 'text', show_user: true },
      ],
    },
  ],
});

/** Just enough of the `aws` package for the catalog: three policy templates, one not agentless. */
export const awsPackageInfoFixture = {
  name: 'aws',
  version: '8.1.2',
  vars: [{ name: 'default_region', type: 'text', show_user: true, default: 'us-east-1' }],
  policy_templates: [
    {
      name: 'guardduty',
      title: 'AWS GuardDuty',
      data_streams: ['guardduty'],
      deployment_modes: { agentless: { enabled: true } },
      inputs: [
        {
          type: 'aws-s3',
          title: 'Collect logs from S3',
          deployment_modes: ['default', 'agentless'],
        },
      ],
    },
    {
      name: 'ec2',
      title: 'AWS EC2',
      data_streams: ['ec2_logs'],
      deployment_modes: { agentless: { enabled: true } },
      inputs: [
        {
          type: 'aws-s3',
          title: 'Collect logs from S3',
          deployment_modes: ['default', 'agentless'],
        },
      ],
    },
    {
      name: 'cloudtrail',
      title: 'AWS CloudTrail',
      data_streams: ['cloudtrail'],
      inputs: [{ type: 'aws-s3', title: 'Collect logs from S3', deployment_modes: ['default'] }],
    },
  ],
  data_streams: [
    logDataStream('guardduty', 'aws.guardduty'),
    logDataStream('ec2_logs', 'aws.ec2_logs'),
    logDataStream('cloudtrail', 'aws.cloudtrail'),
  ],
} as unknown as PackageInfo;
