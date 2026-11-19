/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

import { getServiceDisplayNames } from './service_display_names';

const entry = (overrides: Partial<AwsServiceMatrixEntry>): AwsServiceMatrixEntry =>
  ({ showInUI: true, signalTypes: ['logs'], ...overrides } as AwsServiceMatrixEntry);

describe('getServiceDisplayNames', () => {
  it('uses the plain name for a service whose name is unique', () => {
    const names = getServiceDisplayNames([entry({ id: 'cloudtrail', name: 'AWS CloudTrail' })]);

    expect(names.get('cloudtrail')).toBe('AWS CloudTrail');
  });

  it('adds the signal types when services of the same data format share a name', () => {
    const names = getServiceDisplayNames([
      entry({ id: 'ec2_logs', name: 'Amazon EC2', signalTypes: ['logs'] }),
      entry({ id: 'ec2_metrics', name: 'Amazon EC2', signalTypes: ['metrics'] }),
    ]);

    expect(names.get('ec2_logs')).toMatch(/^Amazon EC2 .+/);
    expect(names.get('ec2_logs')).not.toEqual(names.get('ec2_metrics'));
  });

  it('does not treat the same name in another data format as a duplicate', () => {
    const names = getServiceDisplayNames([
      entry({ id: 'ec2', name: 'Amazon EC2', dataFormat: 'ecs' }),
      entry({ id: 'ec2_otel', name: 'Amazon EC2', dataFormat: 'otel' }),
    ]);

    expect(names.get('ec2')).toBe('Amazon EC2');
    expect(names.get('ec2_otel')).toBe('Amazon EC2');
  });
});
