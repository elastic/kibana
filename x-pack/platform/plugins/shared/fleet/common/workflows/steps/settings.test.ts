/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsOnboardingSettingsAnswer, AwsOnboardingSettingsRequirement } from './settings';
import {
  awsOnboardingSettingsAnswerSchema,
  settingsAnswerToServiceVars,
  validateSettingsAnswer,
} from './settings';

const field = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  title: name,
  type: 'text',
  required: false,
  ...extra,
});

const req: AwsOnboardingSettingsRequirement = {
  package_name: 'aws',
  package_version: '8.18.1',
  region: 'us-east-1',
  services: [
    {
      id: 'guardduty',
      name: 'GuardDuty',
      policy_template: 'guardduty',
      data_streams: [
        {
          id: 'guardduty',
          dataset: 'aws.guardduty',
          type: 'logs',
          title: 'Findings',
          choice: 'one_of',
          inputs: [
            {
              input: 'httpjson',
              ingestion_method: 'API',
              title: 'API polling',
              description: 'Poll the GuardDuty API',
              fields: [
                field('detector_id', { required: true }),
                field('initial_interval', { required: true, default: '24h' }),
              ],
              var_groups: [],
            },
            {
              input: 'aws-s3',
              ingestion_method: 'AWS S3',
              title: 'S3 or SQS',
              description: 'Read from S3',
              fields: [field('queue_url'), field('bucket_arn')],
              var_groups: [
                {
                  name: 'source',
                  title: 'Source',
                  options: [
                    { name: 'sqs', title: 'SQS', vars: ['queue_url'] },
                    { name: 'bucket', title: 'Bucket', vars: ['bucket_arn'] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'ec2',
      name: 'EC2',
      policy_template: 'ec2',
      data_streams: [
        {
          id: 'ec2_metrics',
          dataset: 'aws.ec2_metrics',
          type: 'metrics',
          title: 'Metrics',
          choice: 'toggle',
          default_enabled: true,
          inputs: [
            {
              input: 'aws/metrics',
              ingestion_method: 'API',
              title: 'Metrics',
              description: '',
              fields: [],
              var_groups: [],
            },
          ],
        },
        {
          id: 'ec2_logs',
          dataset: 'aws.ec2_logs',
          type: 'logs',
          title: 'Logs',
          choice: 'one_of',
          default_input: 'aws-cloudwatch',
          inputs: [
            {
              input: 'aws-cloudwatch',
              ingestion_method: 'AWS CloudWatch',
              title: 'CloudWatch',
              description: '',
              fields: [],
              var_groups: [],
            },
          ],
        },
      ],
    },
  ],
};

const okAnswer: AwsOnboardingSettingsAnswer = {
  services: {
    guardduty: {
      data_streams: { guardduty: { input: 'httpjson', vars: { detector_id: '12abc' } } },
    },
    ec2: { data_streams: { ec2_logs: { input: 'aws-cloudwatch' } } },
  },
};

const metricsOff: AwsOnboardingSettingsAnswer = {
  services: {
    ec2: {
      data_streams: {
        ec2_metrics: { input: null },
        ec2_logs: { input: 'aws-cloudwatch' },
      },
    },
  },
};

describe('validateSettingsAnswer', () => {
  it('accepts API polling with a detector id and metrics only', () => {
    expect(validateSettingsAnswer(req, okAnswer)).toEqual([]);
  });

  it('rejects a one_of stream with no input', () => {
    const problems = validateSettingsAnswer(req, {
      services: { guardduty: { data_streams: {} } },
    });
    expect(problems).toContainEqual({
      path: 'guardduty.guardduty.input',
      message: expect.stringContaining('choose a collection method'),
    });
  });

  it('accepts a logs stream set to null when another stream stays enabled', () => {
    expect(
      validateSettingsAnswer(req, {
        services: { ec2: { data_streams: { ec2_logs: { input: null } } } },
      })
    ).toEqual([]);
  });

  it('rejects a service whose streams are all off', () => {
    expect(
      validateSettingsAnswer(req, {
        services: {
          ec2: { data_streams: { ec2_metrics: { input: null }, ec2_logs: { input: null } } },
        },
      })
    ).toEqual([{ path: 'ec2', message: expect.stringContaining('at least one data stream') }]);
  });

  it('rejects a missing required value for the chosen input', () => {
    const problems = validateSettingsAnswer(req, {
      services: { guardduty: { data_streams: { guardduty: { input: 'httpjson' } } } },
    });
    expect(problems.map(({ path }) => path)).toEqual(['guardduty.guardduty.vars.detector_id']);
  });

  it("requires only the selected var-group option's vars and none when they are optional", () => {
    expect(
      validateSettingsAnswer(req, {
        services: {
          guardduty: {
            data_streams: {
              guardduty: { input: 'aws-s3', var_group_selections: { source: 'sqs' } },
            },
          },
        },
      })
    ).toEqual([]);
  });

  it('rejects vars that belong to another input', () => {
    const problems = validateSettingsAnswer(req, {
      services: {
        guardduty: {
          data_streams: {
            guardduty: { input: 'httpjson', vars: { detector_id: 'x', queue_url: 'q' } },
          },
        },
      },
    });
    expect(problems.map(({ path }) => path)).toEqual(['guardduty.guardduty.vars.queue_url']);
  });

  it('rejects an unknown service, stream or input', () => {
    const problems = validateSettingsAnswer(req, {
      services: {
        nope: { data_streams: {} },
        ec2: {
          data_streams: {
            ec2_logs: { input: 'bogus' },
            missing_stream: { input: 'x' },
          },
        },
      },
    });
    expect(problems.map(({ path }) => path).sort()).toEqual(
      ['nope', 'ec2.ec2_logs.input', 'ec2.missing_stream'].sort()
    );
  });

  it('accepts an answer that omits a selected service (deselect) and rejects an empty one', () => {
    expect(
      validateSettingsAnswer(req, {
        services: {
          guardduty: {
            data_streams: { guardduty: { input: 'httpjson', vars: { detector_id: 'x' } } },
          },
        },
      })
    ).toEqual([]);
    expect(validateSettingsAnswer(req, { services: {} })).toContainEqual({
      path: 'services',
      message: expect.any(String),
    });
  });
});

describe('settingsAnswerToServiceVars', () => {
  it('treats an omitted metrics stream as the package default and input null as off', () => {
    const sv = settingsAnswerToServiceVars(req, okAnswer);
    expect(sv.ec2.enabledDataStreams).toEqual(['ec2_metrics', 'ec2_logs']);
    expect(settingsAnswerToServiceVars(req, metricsOff).ec2.enabledDataStreams).toEqual([
      'ec2_logs',
    ]);
  });

  it('maps a chosen input, its vars and var-group selections into ServiceVars', () => {
    const sv = settingsAnswerToServiceVars(req, okAnswer);
    expect(sv.guardduty.varsByDataStream.guardduty).toEqual({
      enabledInputs: ['httpjson'],
      varsByInput: { httpjson: { detector_id: '12abc' } },
      varGroupSelectionsByInput: { httpjson: {} },
    });
  });
});

describe('awsOnboardingSettingsAnswerSchema', () => {
  it('rejects unknown keys', () => {
    const result = awsOnboardingSettingsAnswerSchema.safeParse({
      services: { ec2: { data_streams: {}, extra: 1 } },
    });
    expect(result.success).toBe(false);
  });
});
