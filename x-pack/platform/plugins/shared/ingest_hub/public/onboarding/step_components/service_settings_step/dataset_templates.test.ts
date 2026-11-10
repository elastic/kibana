/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { getCreateDatasetTemplates, getDatasetTemplatesBundle } from './dataset_templates';
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
      ...(createDatasetTemplates !== undefined ? { createDatasetTemplates } : {}),
    },
  },
});

describe('getCreateDatasetTemplates', () => {
  it('leaves the flag unset when nothing opted out', () => {
    expect(getCreateDatasetTemplates([member('a')], { a: vars('aws.prod') })).toBeUndefined();
  });

  it('is false when every stream is customised and opted out', () => {
    const stored = { a: vars('aws.prod', false), b: vars('aws.dev', false) };
    expect(getCreateDatasetTemplates([member('a'), member('b')], stored)).toBe(false);
  });

  it('keeps the template while one stream is left on', () => {
    const stored = { a: vars('aws.prod', false), b: vars('aws.dev') };
    expect(getCreateDatasetTemplates([member('a'), member('b')], stored)).toBeUndefined();
  });

  it('keeps the template while a stream sits at its default dataset, which cannot opt out', () => {
    const stored = { a: vars('aws.prod', false), b: vars('aws.ec2') };
    expect(getCreateDatasetTemplates([member('a'), member('b')], stored)).toBeUndefined();
  });

  it('counts a service that was never configured with its default dataset', () => {
    expect(
      getCreateDatasetTemplates([member('a'), member('b')], { a: vars('aws.prod', false) })
    ).toBeUndefined();
  });

  it('ignores an opt-out left over after the dataset went back to the default', () => {
    expect(getCreateDatasetTemplates([member('a')], { a: vars('aws.ec2', false) })).toBeUndefined();
  });

  it('ignores a service without a dataset var', () => {
    const stored = { a: vars('aws.prod', false) };
    expect(getCreateDatasetTemplates([member('a'), member('b', ecsService)], stored)).toBe(false);
    expect(getCreateDatasetTemplates([member('b', ecsService)], {})).toBeUndefined();
  });

  it('ignores a data stream that is turned off', () => {
    const twoStreams = {
      ...otelService,
      dataStreams: ['ec2', 'lambda'],
      varDefsByDataStream: {
        ...otelService.varDefsByDataStream,
        lambda: otelService.varDefsByDataStream?.ec2,
      },
    } as unknown as AwsServiceMatrixEntry;
    const stored: Record<string, ServiceVars> = {
      a: {
        enabledDataStreams: ['ec2'],
        varsByDataStream: {
          ec2: vars('aws.prod', false).varsByDataStream.ec2,
          lambda: vars('aws.other').varsByDataStream.ec2,
        },
      },
    };
    expect(getCreateDatasetTemplates([member('a', twoStreams)], stored)).toBe(false);
  });

  it('finds the vars by service id for state saved before instances were keyed', () => {
    expect(getCreateDatasetTemplates([member('a')], { ec2: vars('aws.prod', false) })).toBe(false);
  });
});

describe('getDatasetTemplatesBundle', () => {
  const members = [
    member('a', otelService, 'Amazon EC2'),
    member('b', otelService, 'Amazon Lambda'),
    member('c', otelService, 'Amazon RDS'),
    member('d', ecsService, 'AWS ELB'),
  ];

  it('lists the others whose stream sits at the default dataset as requiring the template', () => {
    const stored = { a: vars('aws.prod', false), b: vars('aws.ec2'), c: vars('aws.dev') };
    expect(getDatasetTemplatesBundle('a', members, stored)).toStrictEqual({
      requiredBy: ['Amazon Lambda'],
      sharedWith: ['Amazon Lambda', 'Amazon RDS'],
    });
  });

  it('shares without requiring when every other service has its own switch', () => {
    const stored = { a: vars('aws.prod', false), b: vars('aws.dev'), c: vars('aws.test') };
    expect(getDatasetTemplatesBundle('a', members, stored)).toStrictEqual({
      requiredBy: [],
      sharedWith: ['Amazon Lambda', 'Amazon RDS'],
    });
  });

  it('counts a service that was never configured, which deploys at its default dataset', () => {
    expect(getDatasetTemplatesBundle('a', members, { a: vars('aws.prod') }).requiredBy).toContain(
      'Amazon Lambda'
    );
  });

  it('does not count the service itself or one without a dataset var', () => {
    const bundle = getDatasetTemplatesBundle('a', [members[0], members[3]], {
      a: vars('aws.ec2'),
    });
    expect(bundle).toStrictEqual({ requiredBy: [], sharedWith: [] });
  });
});
