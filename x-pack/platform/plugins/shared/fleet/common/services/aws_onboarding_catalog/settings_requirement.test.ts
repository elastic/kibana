/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryVarsEntry } from '../../types';
import { awsOnboardingSettingsRequirementSchema } from '../../workflows/steps/settings';

import type { AwsServiceMatrixEntry, DataStreamInfo } from './aws_service_matrix';
import {
  buildSettingsRequirement,
  extractReadmeNotes,
  getPolicyTemplateReadmePath,
} from './settings_requirement';

const v = (name: string, extra: Partial<RegistryVarsEntry> = {}): RegistryVarsEntry =>
  ({ name, title: name, type: 'text', ...extra } as RegistryVarsEntry);

const s3Vars = {
  queue_url: v('queue_url', { title: 'Queue URL', show_user: true }),
  bucket_arn: v('bucket_arn', { title: 'Bucket ARN', show_user: true }),
  region: v('region', { required: true }),
  access_key_id: v('access_key_id', { required: true }),
  proxy_url: v('proxy_url'),
};
const s3Groups = [
  {
    name: 'collection_mode',
    title: 'Collection mode',
    selector_title: 'Mode',
    required: true,
    options: [
      { name: 'sqs', title: 'SQS', vars: ['queue_url'] },
      { name: 'bucket', title: 'S3 polling', vars: ['bucket_arn'] },
    ],
  },
];

const guardduty = {
  id: 'guardduty',
  name: 'GuardDuty',
  policyTemplate: 'guardduty',
  dataStreams: ['guardduty'],
  inputs: ['httpjson', 'aws-s3'],
  varDefsByInput: {},
  varGroupsByInput: { 'aws-s3': s3Groups },
  varDefsByDataStream: {
    guardduty: {
      title: 'GuardDuty findings',
      type: 'logs',
      dataset: 'aws.guardduty',
      inputs: ['httpjson', 'aws-s3'],
      defaultEnabledInputs: ['httpjson', 'aws-s3'],
      varDefsByInput: {
        httpjson: {
          detector_id: v('detector_id', {
            title: 'Detector ID',
            required: true,
            // Registry YAML can carry an explicit null default, which the manifest type omits.
            default: null as unknown as undefined,
          }),
          access_key_id: v('access_key_id', { required: true }),
          region: v('region', { required: true }),
          proxy_url: v('proxy_url'),
        },
        'aws-s3': s3Vars,
      },
    } as DataStreamInfo,
  },
} as unknown as AwsServiceMatrixEntry;

const ec2 = {
  id: 'ec2',
  name: 'EC2',
  policyTemplate: 'ec2',
  dataStreams: ['ec2_metrics', 'ec2_logs'],
  varDefsByInput: {},
  varDefsByDataStream: {
    ec2_metrics: {
      title: 'EC2 metrics',
      type: 'metrics',
      dataset: 'aws.ec2_metrics',
      inputs: ['aws/metrics'],
      defaultEnabledInputs: ['aws/metrics'],
      varDefsByInput: { 'aws/metrics': { period: v('period', { required: true, default: '5m' }) } },
    } as DataStreamInfo,
    ec2_logs: {
      title: 'EC2 logs',
      type: 'logs',
      dataset: 'aws.ec2_logs',
      inputs: ['aws-cloudwatch', 'aws-s3'],
      defaultEnabledInputs: ['aws-cloudwatch'],
      varDefsByInput: {
        'aws-cloudwatch': { log_group_arn: v('log_group_arn', { required: true }) },
        'aws-s3': { bucket_arn: v('bucket_arn', { show_user: true }) },
      },
    } as DataStreamInfo,
  },
} as unknown as AwsServiceMatrixEntry;

const packageInfo = {
  name: 'aws',
  version: '8.18.1',
  policy_templates: [{ name: 'guardduty', readme: '/package/aws/8.18.1/docs/guardduty.md' }],
  data_streams: [
    {
      dataset: 'aws.guardduty',
      streams: [
        { input: 'httpjson', ingestion_method: 'API', title: 'GuardDuty API', description: 'api' },
        { input: 'aws-s3', ingestion_method: 'AWS S3', title: 'GuardDuty S3', description: 's3' },
      ],
    },
    {
      dataset: 'aws.ec2_metrics',
      streams: [
        { input: 'aws/metrics', ingestion_method: 'API', title: 'EC2 metrics', description: 'm' },
      ],
    },
    {
      dataset: 'aws.ec2_logs',
      streams: [
        {
          input: 'aws-cloudwatch',
          ingestion_method: 'AWS CloudWatch',
          title: 'EC2 CloudWatch',
          description: 'cw',
        },
        { input: 'aws-s3', ingestion_method: 'AWS S3', title: 'EC2 S3', description: 's3' },
      ],
    },
  ],
} as unknown as PackageInfo;

const build = (readmeNotesByService?: Record<string, string>) =>
  buildSettingsRequirement({
    services: [guardduty, ec2],
    packageInfo,
    region: 'us-east-1',
    readmeNotesByService,
  });

const dataStream = (requirement: ReturnType<typeof build>, serviceId: string, dsId: string) => {
  const found = requirement.services
    .find(({ id }) => id === serviceId)
    ?.data_streams.find(({ id }) => id === dsId);
  if (!found) throw new Error(`missing ${serviceId}/${dsId}`);
  return found;
};

describe('buildSettingsRequirement', () => {
  it('builds a one_of group per log data stream with ingestion_method labels and no default when both inputs are enabled', () => {
    const stream = dataStream(build(), 'guardduty', 'guardduty');

    expect(stream.choice).toBe('one_of');
    expect(stream.default_input).toBeUndefined();
    expect(stream.inputs.map(({ input, ingestion_method: method }) => [input, method])).toEqual([
      ['httpjson', 'API'],
      ['aws-s3', 'AWS S3'],
    ]);
  });

  it('marks default_input when exactly one input is default-enabled', () => {
    expect(dataStream(build(), 'ec2', 'ec2_logs').default_input).toBe('aws-cloudwatch');
  });

  it('produces a requirement that parses against the contract schema', () => {
    expect(() =>
      awsOnboardingSettingsRequirementSchema.parse(build({ guardduty: '- n' }))
    ).not.toThrow();
  });

  it('builds a toggle for a metrics data stream', () => {
    const stream = dataStream(build(), 'ec2', 'ec2_metrics');

    expect(stream).toMatchObject({ choice: 'toggle', type: 'metrics', default_enabled: true });
  });

  it('lists only required or show_user fields under the right input, without region or credentials', () => {
    const stream = dataStream(build(), 'guardduty', 'guardduty');
    const names = (input: string) =>
      stream.inputs.find((i) => i.input === input)?.fields.map(({ name }) => name);

    expect(names('httpjson')).toEqual(['detector_id']);
    expect(names('aws-s3')).toEqual(['queue_url', 'bucket_arn']);
    expect(stream.inputs[0].fields[0]).toEqual({
      name: 'detector_id',
      title: 'Detector ID',
      type: 'text',
      required: true,
    });
  });

  it('carries var groups from the matrix entry with the default option first and marks their vars required', () => {
    const s3 = dataStream(build(), 'guardduty', 'guardduty').inputs[1];

    expect(s3.var_groups).toEqual([
      {
        name: 'collection_mode',
        title: 'Collection mode',
        options: [
          { name: 'sqs', title: 'SQS', vars: ['queue_url'] },
          { name: 'bucket', title: 'S3 polling', vars: ['bucket_arn'] },
        ],
      },
    ]);
    expect(s3.fields.every(({ required }) => required)).toBe(true);
  });

  it('attaches readme notes per service when given', () => {
    const requirement = build({ guardduty: '- note' });

    expect(requirement.services.map(({ readme_notes: notes }) => notes)).toEqual([
      '- note',
      undefined,
    ]);
  });
});

const GUARDDUTY_README = `# Amazon GuardDuty Integration

## Overview

Some intro.

Note:

- It is recommended to use AWS SQS for Amazon GuardDuty.
- When using the Amazon GuardDuty API to collect logs, data duplication can occur due to limitations with the current input.

## Setup

- Not part of the notes.
`;

describe('extractReadmeNotes', () => {
  it('returns the notes bullets from the guardduty README and undefined when absent', () => {
    expect(extractReadmeNotes(GUARDDUTY_README)).toBe(
      [
        '- It is recommended to use AWS SQS for Amazon GuardDuty.',
        '- When using the Amazon GuardDuty API to collect logs, data duplication can occur due to limitations with the current input.',
      ].join('\n')
    );
    expect(extractReadmeNotes('# Title\n\n- a bullet but no heading\n')).toBeUndefined();
  });

  it('reads the real guardduty text: emphasis on the word only, trailing space, one-space bullets', () => {
    const readme =
      '## Setup\n\n**Note**: \n - It is recommended to use AWS SQS for Amazon GuardDuty.\n - When using the Amazon GuardDuty API to collect logs, data duplication can occur due to limitations with the current input.\n\nNext.\n';

    expect(extractReadmeNotes(readme)).toBe(
      '- It is recommended to use AWS SQS for Amazon GuardDuty.\n- When using the Amazon GuardDuty API to collect logs, data duplication can occur due to limitations with the current input.'
    );
  });

  it('reads a blockquote Note', () => {
    expect(extractReadmeNotes('> **Note**:\n> - One\n> - Two\n\nAfter\n')).toBe('- One\n- Two');
  });

  it('ignores a loose "note" in prose even when a later list exists', () => {
    const readme =
      '# Title\n\nPlease note that this is an intro.\n\n## Setup\n\n- Step one\n- Step two\n';

    expect(extractReadmeNotes(readme)).toBeUndefined();
  });

  it('reads the list two lines under a Notes heading', () => {
    expect(
      extractReadmeNotes('# Title\n\n## Notes\n\n- First\n- Second\n\n## Setup\n\n- Step\n')
    ).toBe('- First\n- Second');
  });
});

describe('getPolicyTemplateReadmePath', () => {
  it('strips the package prefix so the registry file API can take the path', () => {
    expect(getPolicyTemplateReadmePath(packageInfo, 'guardduty')).toBe('docs/guardduty.md');
    expect(getPolicyTemplateReadmePath(packageInfo, 'ec2')).toBeUndefined();
  });
});
