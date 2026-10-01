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
    isManifestLoaded: true,
    isManifestError: false,
    isStaticAgentBasedOnly: false,
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

  it('uses the namespace instead of the wildcard when one is given', () => {
    const entry = makeEntry({
      varDefsByDataStream: {
        ec2_logs: {
          type: 'logs',
          dataset: 'aws.ec2_logs',
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
      },
    });
    expect(getServiceIndexPatterns(entry, 'prod_eu')).toEqual(['logs-aws.ec2_logs-prod_eu']);
  });

  it('falls back to the wildcard for an empty namespace', () => {
    const entry = makeEntry({
      varDefsByDataStream: {
        ec2_logs: {
          type: 'logs',
          dataset: 'aws.ec2_logs',
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
      },
    });
    expect(getServiceIndexPatterns(entry, '')).toEqual(['logs-aws.ec2_logs-*']);
  });

  it.each(['Prod', 'é'.repeat(51)])(
    'falls back to the wildcard for the namespace %s, which the has_data route would reject',
    (namespace) => {
      const entry = makeEntry({
        varDefsByDataStream: {
          ec2_logs: {
            type: 'logs',
            dataset: 'aws.ec2_logs',
            inputs: [],
            defaultEnabledInputs: {},
            varDefsByInput: {},
          } as any,
        },
      });
      expect(getServiceIndexPatterns(entry, namespace)).toEqual(['logs-aws.ec2_logs-*']);
    }
  );

  it.each(['prod@eu', 'producción'])('keeps the Fleet-valid namespace %s concrete', (namespace) => {
    const entry = makeEntry({
      varDefsByDataStream: {
        ec2_logs: {
          type: 'logs',
          dataset: 'aws.ec2_logs',
          inputs: [],
          defaultEnabledInputs: {},
          varDefsByInput: {},
        } as any,
      },
    });
    expect(getServiceIndexPatterns(entry, namespace)).toEqual([`logs-aws.ec2_logs-${namespace}`]);
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

  describe('OTel entries (dataFormat === otel)', () => {
    it('returns logs-aws.<ecfLogType>.otel-* for ECF OTel log twins', () => {
      const entry = makeEntry({ dataFormat: 'otel', ecfLogType: 'cloudtrail' as any });
      expect(getServiceIndexPatterns(entry)).toEqual(['logs-aws.cloudtrail.otel-*']);
    });

    it('keeps the wildcard for ECF OTel log twins even when a namespace is given', () => {
      const entry = makeEntry({ dataFormat: 'otel', ecfLogType: 'cloudtrail' as any });
      expect(getServiceIndexPatterns(entry, 'prod')).toEqual(['logs-aws.cloudtrail.otel-*']);
    });

    it('uses ecfLogType over any ECS-derived varDefsByDataStream dataset', () => {
      // ECF OTel twins alias ECS policy templates — varDefsByDataStream carries ECS datasets.
      const entry = makeEntry({
        dataFormat: 'otel',
        ecfLogType: 'vpcflow' as any,
        varDefsByDataStream: {
          vpcflow: {
            type: 'logs',
            dataset: 'aws.vpcflow',
            inputs: ['aws-s3'],
            defaultEnabledInputs: {},
            varDefsByInput: { 'aws-s3': { queue_url: { type: 'text' } as any } },
          } as any,
        },
      });
      expect(getServiceIndexPatterns(entry)).toEqual(['logs-aws.vpcflow.otel-*']);
    });

    it('uses ecfLogType for elbaccess (differs from elb_logs data stream id)', () => {
      const entry = makeEntry({ dataFormat: 'otel', ecfLogType: 'elbaccess' as any });
      expect(getServiceIndexPatterns(entry)).toEqual(['logs-aws.elbaccess.otel-*']);
    });

    it('extracts dataset/type from varDefsByInput for OTel input packages', () => {
      // aws_cloudwatch_input_otel entries store data_stream.dataset/type as var defaults.
      const entry = makeEntry({
        dataFormat: 'otel',
        packageName: 'aws_cloudwatch_input_otel',
        varDefsByDataStream: {
          ec2_otel: {
            type: 'metrics',
            dataset: undefined,
            inputs: ['otelcol'],
            defaultEnabledInputs: {},
            varDefsByInput: {
              otelcol: {
                'data_stream.dataset': { type: 'text', default: 'aws.ec2' } as any,
                'data_stream.type': { type: 'text', default: 'metrics' } as any,
              },
            },
          } as any,
        },
      });
      expect(getServiceIndexPatterns(entry)).toEqual(['metrics-aws.ec2-*']);
      expect(getServiceIndexPatterns(entry, 'prod')).toEqual(['metrics-aws.ec2-prod']);
    });

    it('falls back to logs-packageName.*-* for OTel entry with no ecfLogType and no varDefsByDataStream', () => {
      const entry = makeEntry({ dataFormat: 'otel', packageName: 'aws_cloudwatch_input_otel' });
      expect(getServiceIndexPatterns(entry)).toEqual(['logs-aws_cloudwatch_input_otel.*-*']);
    });
  });
});
