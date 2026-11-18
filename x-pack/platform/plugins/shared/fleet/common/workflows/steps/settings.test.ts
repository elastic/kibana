/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsOnboardingSettingsAnswer, AwsOnboardingSettingsRequirement } from './settings';
import {
  awsOnboardingPlanAnswerSchema,
  awsOnboardingSettingsAnswerSchema,
  settingsAnswerToServiceVars,
  validateSettingsAnswer,
} from './settings';

const field = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  title: name,
  type: 'text',
  required: false,
  advanced: false,
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
                field('processors', { advanced: true }),
              ],
              var_groups: [],
            },
            // The shape buildSettingsRequirement gives an S3 input whose manifest has no var_groups.
            {
              input: 'aws-s3',
              ingestion_method: 'AWS S3',
              title: 'S3 or SQS',
              description: 'Read from S3',
              fields: [
                field('bucket_arn', { required: true }),
                field('access_point_arn', { required: true }),
                field('queue_url', { required: true }),
              ],
              var_groups: [
                {
                  name: 'source',
                  title: 'Source',
                  options: [
                    { name: 'bucket_arn', title: 'Bucket ARN', vars: ['bucket_arn'] },
                    {
                      name: 'access_point_arn',
                      title: 'Access point ARN',
                      vars: ['access_point_arn'],
                    },
                    { name: 'queue_url', title: 'Queue URL', vars: ['queue_url'] },
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
            // The shape buildSettingsRequirement gives a CloudWatch input without var_groups.
            {
              input: 'aws-cloudwatch',
              ingestion_method: 'AWS CloudWatch',
              title: 'CloudWatch',
              description: '',
              fields: [
                field('log_group_arn', { required: true }),
                field('log_group_name', { required: true }),
                field('log_group_name_prefix', { required: true }),
              ],
              var_groups: [
                {
                  name: 'source',
                  title: 'Source',
                  options: [
                    { name: 'log_group_arn', title: 'Log group ARN', vars: ['log_group_arn'] },
                    {
                      name: 'log_group_name',
                      title: 'Log group name',
                      vars: ['log_group_name', 'region_name'],
                    },
                    {
                      name: 'log_group_name_prefix',
                      title: 'Log group name prefix',
                      vars: ['log_group_name_prefix', 'region_name'],
                    },
                  ],
                },
              ],
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
    ec2: {
      data_streams: {
        ec2_logs: { input: 'aws-cloudwatch', vars: { log_group_arn: 'arn:aws:logs:group' } },
      },
    },
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

  it('rejects a CloudWatch logs stream with no log group', () => {
    const problems = validateSettingsAnswer(req, {
      services: { ec2: { data_streams: { ec2_logs: { input: 'aws-cloudwatch' } } } },
    });
    expect(problems.map(({ path }) => path)).toEqual(['ec2.ec2_logs.vars.log_group_arn']);
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

  it("requires only the selected source option's var", () => {
    const problems = validateSettingsAnswer(req, {
      services: {
        guardduty: {
          data_streams: {
            guardduty: { input: 'aws-s3', var_group_selections: { source: 'queue_url' } },
          },
        },
        ec2: {
          data_streams: {
            ec2_logs: {
              input: 'aws-cloudwatch',
              vars: { log_group_arn: 'arn:aws:logs:group' },
              var_group_selections: { source: 'log_group_name' },
            },
          },
        },
      },
    });
    expect(problems.map(({ path }) => path)).toEqual([
      'guardduty.guardduty.vars.queue_url',
      'ec2.ec2_logs.vars.log_group_name',
    ]);
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

  it("drops the values of unselected source options and fills the selected option's region", () => {
    const sv = settingsAnswerToServiceVars(req, {
      services: {
        ec2: {
          data_streams: {
            ec2_logs: {
              input: 'aws-cloudwatch',
              vars: { log_group_arn: 'arn:aws:logs:group', log_group_name: 'my-group' },
              var_group_selections: { source: 'log_group_name' },
            },
          },
        },
      },
    });
    expect(sv.ec2.varsByDataStream.ec2_logs?.varsByInput['aws-cloudwatch']).toEqual({
      log_group_name: 'my-group',
      region_name: 'us-east-1',
    });
  });

  it('accepts an advanced value the user names and passes it through to ServiceVars', () => {
    const answer = awsOnboardingSettingsAnswerSchema.parse({
      services: {
        guardduty: {
          data_streams: {
            guardduty: {
              input: 'httpjson',
              vars: { detector_id: 'd-1', processors: '- drop_fields: {}' },
            },
          },
        },
      },
    });

    expect(validateSettingsAnswer(req, answer)).toEqual([]);
    expect(
      settingsAnswerToServiceVars(req, answer).guardduty.varsByDataStream.guardduty?.varsByInput
        .httpjson.processors
    ).toBe('- drop_fields: {}');
  });

  it('accepts a number for a var and stringifies it', () => {
    const answer = awsOnboardingSettingsAnswerSchema.parse({
      services: {
        guardduty: {
          data_streams: { guardduty: { input: 'httpjson', vars: { detector_id: 300 } } },
        },
      },
    });
    expect(
      settingsAnswerToServiceVars(req, answer).guardduty.varsByDataStream.guardduty?.varsByInput
        .httpjson
    ).toEqual({ detector_id: '300' });
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

describe('awsOnboardingPlanAnswerSchema', () => {
  it('takes either a new identity name or an identity to reuse, not both', () => {
    const plan = (identity: unknown) =>
      awsOnboardingPlanAnswerSchema.safeParse({ services: {}, identity }).success;

    expect(plan({ name: 'new-identity' })).toBe(true);
    expect(plan({ reuse_cloud_connector_id: 'cc-1' })).toBe(true);
    expect(plan({ name: 'new-identity', reuse_cloud_connector_id: 'cc-1' })).toBe(false);
  });
});
