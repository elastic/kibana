/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceIndexPatterns } from './service_index_patterns';
import type { AwsServiceMatrixEntry } from '../aws_service_matrix';

function makeEntry(overrides: Partial<AwsServiceMatrixEntry> = {}): AwsServiceMatrixEntry {
  return {
    id: 'test',
    name: 'Test',
    packageName: 'aws',
    category: 'compute',
    dataStreams: [],
    signalTypes: [],
    deploymentMethods: [],
    defaultEnabled: true,
    defaultEnabledInputs: [],
    showInUI: true,
    ...overrides,
  };
}

describe('getServiceIndexPatterns', () => {
  it('returns type-dataset-* patterns for data streams with both fields', () => {
    const entry = makeEntry({
      varDefsByDataStream: {
        ec2_logs: {
          type: 'logs',
          dataset: 'aws.ec2_logs',
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
        ec2_metrics: {
          type: 'metrics',
          dataset: 'aws.ec2_metrics',
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
      },
    });
    const patterns = getServiceIndexPatterns(entry);
    expect(patterns).toEqual(['logs-aws.ec2_logs-*', 'metrics-aws.ec2_metrics-*']);
  });

  it('skips data streams missing dataset and falls back to package-level pattern', () => {
    const entry = makeEntry({
      varDefsByDataStream: {
        ec2_logs: {
          type: 'logs',
          dataset: undefined,
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
      },
    });
    const patterns = getServiceIndexPatterns(entry);
    // Fallback pattern — not a valid server-side pattern, but correct for client display/debug.
    expect(patterns).toEqual(['logs-aws.*-*']);
  });

  it('skips data streams missing type and falls back to package-level pattern', () => {
    const entry = makeEntry({
      varDefsByDataStream: {
        ec2_logs: {
          type: undefined,
          dataset: 'aws.ec2_logs',
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
      },
    });
    const patterns = getServiceIndexPatterns(entry);
    expect(patterns).toEqual(['logs-aws.*-*']);
  });

  it('falls back to logs-packageName.*-* when no varDefsByDataStream', () => {
    const entry = makeEntry({ packageName: 'aws_bedrock' });
    expect(getServiceIndexPatterns(entry)).toEqual(['logs-aws_bedrock.*-*']);
  });

  it('deduplicates identical patterns', () => {
    const entry = makeEntry({
      varDefsByDataStream: {
        a: {
          type: 'logs',
          dataset: 'aws.vpcflow',
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
        b: {
          type: 'logs',
          dataset: 'aws.vpcflow',
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
      },
    });
    expect(getServiceIndexPatterns(entry)).toEqual(['logs-aws.vpcflow-*']);
  });
});
