/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRegionFieldName,
  getRequiredTextFields,
  getFlyoutFields,
  resolveFieldMeta,
  toTyped,
  toDraft,
} from './field_config';
import type { AwsServiceMatrixEntry, ServiceVarDef } from '../../aws_service_matrix';
import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';

function makeVarDef(
  name: string,
  type: RegistryVarsEntry['type'],
  opts: Partial<RegistryVarsEntry & { inputs: string[] }> = {}
): ServiceVarDef {
  const { inputs = [], ...rest } = opts;
  return {
    def: { name, type, title: name, show_user: true, ...rest } as RegistryVarsEntry,
    inputs,
  };
}

function makeService(overrides: Partial<AwsServiceMatrixEntry> = {}): AwsServiceMatrixEntry {
  return {
    id: 'test',
    name: 'Test Service',
    category: 'compute',
    signalType: 'logs',
    inputs: [],
    deploymentMethods: [],
    showInUI: true,
    packageName: 'aws',
    defaultEnabled: true,
    ...overrides,
  } as AwsServiceMatrixEntry;
}

describe('getRegionFieldName', () => {
  it('returns "region" for S3 input when service has region in requiredConfig', () => {
    const service = makeService({ requiredConfig: ['region', 'bucket_arn'] });
    expect(getRegionFieldName(service, 'aws-s3')).toBe('region');
  });

  it('returns "region_name" for CloudWatch input when service has region_name in requiredConfig', () => {
    const service = makeService({ requiredConfig: ['region_name', 'log_group_arn'] });
    expect(getRegionFieldName(service, 'aws-cloudwatch')).toBe('region_name');
  });

  it('returns "aws_region" when service has aws_region in requiredConfig', () => {
    const service = makeService({ requiredConfig: ['aws_region'] });
    expect(getRegionFieldName(service, null)).toBe('aws_region');
  });

  it('falls back to "aws_region" when no matching region field exists', () => {
    const service = makeService({ requiredConfig: [] });
    expect(getRegionFieldName(service, 'aws-s3')).toBe('aws_region');
  });
});

describe('resolveFieldMeta', () => {
  it('returns undefined for a var not in varDefs', () => {
    const service = makeService();
    expect(resolveFieldMeta(service, 'bucket_arn')).toBeUndefined();
  });

  it('resolves label from title', () => {
    const service = makeService({
      varDefs: {
        bucket_arn: makeVarDef('bucket_arn', 'text', { title: 'Bucket ARN', inputs: ['aws-s3'] }),
      },
    });
    const meta = resolveFieldMeta(service, 'bucket_arn');
    expect(meta?.def.title).toBe('Bucket ARN');
  });

  it('derives input from single input', () => {
    const service = makeService({
      varDefs: { bucket_arn: makeVarDef('bucket_arn', 'text', { inputs: ['aws-s3'] }) },
    });
    const meta = resolveFieldMeta(service, 'bucket_arn');
    expect(meta?.input).toBe('aws-s3');
  });

  it('derives no input for a var shared between inputs', () => {
    const service = makeService({
      varDefs: {
        preserve_original_event: makeVarDef('preserve_original_event', 'bool', {
          inputs: ['aws-s3', 'aws-cloudwatch'],
        }),
      },
    });
    const meta = resolveFieldMeta(service, 'preserve_original_event');
    expect(meta?.input).toBeUndefined();
  });

  it('sets isBool true for type bool', () => {
    const service = makeService({
      varDefs: { collect_s3_logs: makeVarDef('collect_s3_logs', 'bool', { inputs: ['aws-s3'] }) },
    });
    const meta = resolveFieldMeta(service, 'collect_s3_logs');
    expect(meta?.isBool).toBe(true);
  });

  it('sets multi true for multi vars', () => {
    const service = makeService({
      varDefs: { tags: makeVarDef('tags', 'text', { multi: true, inputs: [] }) },
    });
    const meta = resolveFieldMeta(service, 'tags');
    expect(meta?.multi).toBe(true);
  });
});

describe('toTyped / toDraft', () => {
  const boolMeta = resolveFieldMeta(
    makeService({ varDefs: { f: makeVarDef('f', 'bool', { inputs: [] }) } }),
    'f'
  )!;
  const multiMeta = resolveFieldMeta(
    makeService({ varDefs: { f: makeVarDef('f', 'text', { multi: true, inputs: [] }) } }),
    'f'
  )!;
  const textMeta = resolveFieldMeta(
    makeService({ varDefs: { f: makeVarDef('f', 'text', { inputs: [] }) } }),
    'f'
  )!;

  it('toTyped: bool string "true" → true', () => {
    expect(toTyped('true', boolMeta)).toBe(true);
  });

  it('toTyped: bool string "false" → false', () => {
    expect(toTyped('false', boolMeta)).toBe(false);
  });

  it('toTyped: bool undefined uses manifest default', () => {
    expect(toTyped(undefined, boolMeta)).toBe(false);
  });

  it('toTyped: multi comma-separated → array', () => {
    expect(toTyped('a,b, c', multiMeta)).toEqual(['a', 'b', 'c']);
  });

  it('toTyped: multi empty → empty array', () => {
    expect(toTyped('', multiMeta)).toEqual([]);
  });

  it('toTyped: text passes through', () => {
    expect(toTyped('hello', textMeta)).toBe('hello');
  });

  it('toDraft: array → joined string', () => {
    expect(toDraft(['a', 'b'])).toBe('a,b');
  });

  it('toDraft: bool → string', () => {
    expect(toDraft(true)).toBe('true');
    expect(toDraft(false)).toBe('false');
  });

  it('toDraft: undefined → empty string', () => {
    expect(toDraft(undefined)).toBe('');
  });
});

describe('getRequiredTextFields', () => {
  it('excludes region fields', () => {
    const service = makeService({
      requiredConfig: ['region', 'bucket_arn'],
      varDefs: {
        region: makeVarDef('region', 'text', { inputs: ['aws-s3'] }),
        bucket_arn: makeVarDef('bucket_arn', 'text', { inputs: ['aws-s3'] }),
      },
    });
    const result = getRequiredTextFields(service, 'aws-s3');
    expect(result).not.toContain('region');
    expect(result).toContain('bucket_arn');
  });

  it('excludes input-mismatched fields', () => {
    const service = makeService({
      requiredConfig: ['bucket_arn', 'log_group_arn'],
      varDefs: {
        bucket_arn: makeVarDef('bucket_arn', 'text', { inputs: ['aws-s3'] }),
        log_group_arn: makeVarDef('log_group_arn', 'text', { inputs: ['aws-cloudwatch'] }),
      },
    });
    const result = getRequiredTextFields(service, 'aws-cloudwatch');
    expect(result).not.toContain('bucket_arn');
    expect(result).toContain('log_group_arn');
  });

  it('includes a var with no input restriction for any active input', () => {
    const service = makeService({
      requiredConfig: ['detector_id'],
      varDefs: {
        detector_id: makeVarDef('detector_id', 'text', { inputs: ['httpjson'] }),
      },
    });
    // inputs: ['httpjson'] — not 'aws-s3' or 'aws-cloudwatch', so no input derived
    expect(getRequiredTextFields(service, 'aws-s3')).toContain('detector_id');
    expect(getRequiredTextFields(service, 'aws-cloudwatch')).toContain('detector_id');
  });

  it('excludes bool vars', () => {
    const service = makeService({
      requiredConfig: ['collect_s3_logs'],
      varDefs: {
        collect_s3_logs: makeVarDef('collect_s3_logs', 'bool', { inputs: ['aws-s3'] }),
      },
    });
    expect(getRequiredTextFields(service, 'aws-s3')).not.toContain('collect_s3_logs');
  });

  it('returns empty array when no varDefs present', () => {
    const service = makeService({ requiredConfig: ['bucket_arn'] });
    expect(getRequiredTextFields(service, 'aws-s3')).toEqual([]);
  });
});

describe('getFlyoutFields', () => {
  it('excludes bool vars', () => {
    const service = makeService({
      requiredConfig: ['collect_s3_logs'],
      varDefs: {
        collect_s3_logs: makeVarDef('collect_s3_logs', 'bool', { inputs: ['aws-s3'] }),
      },
    });
    expect(getFlyoutFields(service, 'aws-s3')).not.toContain('collect_s3_logs');
  });

  it('excludes input-mismatched fields', () => {
    const service = makeService({
      requiredConfig: ['bucket_arn', 'log_group_arn'],
      varDefs: {
        bucket_arn: makeVarDef('bucket_arn', 'text', { inputs: ['aws-s3'] }),
        log_group_arn: makeVarDef('log_group_arn', 'text', { inputs: ['aws-cloudwatch'] }),
      },
    });
    expect(getFlyoutFields(service, 'aws-cloudwatch')).not.toContain('bucket_arn');
    expect(getFlyoutFields(service, 'aws-cloudwatch')).toContain('log_group_arn');
  });

  it('includes fields from optionalConfig', () => {
    const service = makeService({
      requiredConfig: [],
      optionalConfig: ['queue_url'],
      varDefs: {
        queue_url: makeVarDef('queue_url', 'text', { inputs: ['aws-s3'] }),
      },
    });
    expect(getFlyoutFields(service, 'aws-s3')).toContain('queue_url');
  });
});
