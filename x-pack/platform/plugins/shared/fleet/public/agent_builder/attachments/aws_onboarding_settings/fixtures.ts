/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsOnboardingSettingsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_settings_attachment';

export const settingsAttachmentData: AwsOnboardingSettingsAttachmentData = {
  execution_id: 'exec-1',
  requirement: {
    package_name: 'aws',
    package_version: '8.1.2',
    region: 'us-west-2',
    services: [
      {
        id: 'guardduty',
        name: 'Amazon GuardDuty',
        policy_template: 'guardduty',
        readme_notes: 'GuardDuty findings can be duplicated when polling the API.',
        data_streams: [
          {
            id: 'guardduty_findings',
            dataset: 'aws.guardduty',
            type: 'logs',
            title: 'Findings',
            choice: 'one_of',
            default_input: 'aws-s3',
            inputs: [
              {
                input: 'aws-s3',
                ingestion_method: 'S3 + SQS notifications',
                title: 'Collect logs from S3',
                description: 'The agent reads SQS notifications.',
                fields: [{ name: 'queue_url', title: 'Queue URL', type: 'text', required: true }],
                var_groups: [],
              },
              {
                input: 'cel',
                ingestion_method: 'GuardDuty API polling',
                title: 'Collect logs from the API',
                description: 'The agent polls the GuardDuty API.',
                fields: [
                  { name: 'detector_id', title: 'Detector ID', type: 'text', required: true },
                ],
                var_groups: [],
              },
            ],
          },
        ],
      },
      {
        id: 'ec2',
        name: 'Amazon EC2',
        policy_template: 'ec2',
        data_streams: [
          {
            id: 'ec2_metrics',
            dataset: 'aws.ec2_metrics',
            type: 'metrics',
            title: 'EC2 metrics',
            choice: 'toggle',
            default_enabled: true,
            inputs: [
              {
                input: 'aws/metrics',
                ingestion_method: 'CloudWatch metrics',
                title: 'Collect metrics',
                description: 'Metrics from CloudWatch.',
                fields: [],
                var_groups: [],
              },
            ],
          },
          {
            id: 'ec2_logs',
            dataset: 'aws.ec2_logs',
            type: 'logs',
            title: 'EC2 logs',
            choice: 'one_of',
            inputs: [
              {
                input: 'aws-cloudwatch',
                ingestion_method: 'CloudWatch Logs',
                title: 'Collect logs from CloudWatch',
                description: 'Needs a log group.',
                fields: [
                  { name: 'log_group_arn', title: 'Log group ARN', type: 'text', required: true },
                  {
                    name: 'regions',
                    title: 'Regions',
                    type: 'text',
                    required: false,
                    multi: true,
                  },
                ],
                var_groups: [],
              },
            ],
          },
        ],
      },
    ],
  },
};
