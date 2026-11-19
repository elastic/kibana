/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { getCreateDatasetTemplates, getDatasetTemplatesPolicy } from './dataset_templates';
import type { ServiceInstance, ServiceVars } from './use_service_settings';

const otelService = {
  id: 'ec2',
  packageName: 'aws_cloudwatch_input_otel',
  dataStreams: ['ec2'],
  defaultEnabled: true,
  defaultEnabledInputs: ['otelcol'],
  varDefsByDataStream: {
    ec2: {
      inputs: ['otelcol'],
      defaultEnabledInputs: ['otelcol'],
      varDefsByInput: {
        otelcol: { 'data_stream.dataset': { name: 'data_stream.dataset', default: 'aws.ec2' } },
      },
    },
  },
} as unknown as AwsServiceMatrixEntry;

// An ECS service of the `aws` package: no dataset var, so Fleet makes no dataset template for it.
const ecsService = {
  id: 'elb',
  packageName: 'aws',
  dataStreams: ['elb_logs'],
  defaultEnabled: true,
  varDefsByDataStream: {
    elb_logs: { inputs: ['aws-s3'], defaultEnabledInputs: ['aws-s3'], varDefsByInput: {} },
  },
} as unknown as AwsServiceMatrixEntry;

const member = (id: string, service = otelService, name = id) => ({
  instance: { instanceId: id, serviceId: service.id, name, isDuplicate: false } as ServiceInstance,
  service,
});

const vars = (dataset: string, createDatasetTemplates?: boolean): ServiceVars => ({
  enabledDataStreams: ['ec2'],
  varsByDataStream: {
    ec2: {
      enabledInputs: ['otelcol'],
      varsByInput: { otelcol: { 'data_stream.dataset': dataset } },
    },
  },
  ...(createDatasetTemplates !== undefined ? { createDatasetTemplates } : {}),
});

describe('getCreateDatasetTemplates', () => {
  it('is on by default, for a dataset at its default as well as a custom one', () => {
    expect(getCreateDatasetTemplates([member('a')], { a: vars('aws.prod') })).toBe(true);
    expect(getCreateDatasetTemplates([member('a')], { a: vars('aws.ec2') })).toBe(true);
  });

  it('is off once the service opted out', () => {
    expect(getCreateDatasetTemplates([member('a')], { a: vars('aws.prod', false) })).toBe(false);
  });

  it('takes one value for the policy: off only when every service turned it off', () => {
    const members = [member('a'), member('b')];

    expect(
      getCreateDatasetTemplates(members, { a: vars('aws.a', false), b: vars('aws.b', false) })
    ).toBe(false);
    expect(getCreateDatasetTemplates(members, { a: vars('aws.a', false), b: vars('aws.b') })).toBe(
      true
    );
  });

  it('counts a service that was never configured, which deploys with its default dataset', () => {
    expect(
      getCreateDatasetTemplates([member('a'), member('b')], { a: vars('aws.prod', false) })
    ).toBe(true);
  });

  it('is unset when the switch applies to none of the services', () => {
    expect(getCreateDatasetTemplates([member('a', ecsService)], {})).toBeUndefined();
    expect(getCreateDatasetTemplates([member('a')], { a: vars('generic') })).toBeUndefined();
  });

  it('ignores a service the switch does not apply to', () => {
    const stored = { a: vars('aws.prod', false) };
    expect(getCreateDatasetTemplates([member('a'), member('b', ecsService)], stored)).toBe(false);
  });

  it('ignores a data stream that is turned off', () => {
    const stored: Record<string, ServiceVars> = {
      a: { ...vars('aws.prod', false), enabledDataStreams: [] },
    };
    expect(getCreateDatasetTemplates([member('a')], stored)).toBeUndefined();
  });

  it('finds the vars by service id for state saved before instances were keyed', () => {
    expect(getCreateDatasetTemplates([member('a')], { ec2: vars('aws.prod', false) })).toBe(false);
  });
});

describe('getDatasetTemplatesPolicy', () => {
  const members = [
    member('a', otelService, 'Amazon EC2'),
    member('b', otelService, 'Amazon Lambda'),
    member('c', ecsService, 'AWS ELB'),
  ];

  it('gives the value every switch of the policy shows, and the services a change reaches', () => {
    const stored = { a: vars('aws.prod', false), b: vars('aws.dev') };

    expect(getDatasetTemplatesPolicy('a', members, stored)).toStrictEqual({
      enabled: true,
      instanceIds: ['a', 'b'],
      sharedWith: ['Amazon Lambda'],
    });
    expect(getDatasetTemplatesPolicy('b', members, stored)?.enabled).toBe(true);
  });

  it('is off when every service turned it off', () => {
    const stored = { a: vars('aws.prod', false), b: vars('aws.dev', false) };

    expect(getDatasetTemplatesPolicy('a', members, stored)?.enabled).toBe(false);
  });

  it('shares with no one for a service that has its policy to itself', () => {
    expect(getDatasetTemplatesPolicy('a', [members[0]], { a: vars('aws.prod') })).toStrictEqual({
      enabled: true,
      instanceIds: ['a'],
      sharedWith: [],
    });
  });

  it('is undefined for a service the switch does not apply to', () => {
    expect(getDatasetTemplatesPolicy('c', members, {})).toBeUndefined();
    expect(getDatasetTemplatesPolicy('a', [members[0]], { a: vars('generic') })).toBeUndefined();
  });
});
