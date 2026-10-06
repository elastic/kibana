/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMissingSourceGroup,
  shouldDefaultCollectS3Logs,
  getRegionFieldName,
  getRequiredTextFields,
  getFlyoutFields,
  resolveFieldMeta,
  toTyped,
  toDraft,
} from './field_config';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';

function makeVarDef(
  name: string,
  type: RegistryVarsEntry['type'],
  opts: Partial<RegistryVarsEntry> = {}
): RegistryVarsEntry {
  return { name, type, title: name, show_user: true, ...opts } as RegistryVarsEntry;
}

function makeService(overrides: Partial<AwsServiceMatrixEntry> = {}): AwsServiceMatrixEntry {
  return {
    id: 'test',
    name: 'Test Service',
    category: 'compute',
    signalTypes: ['logs'],
    dataStreams: [],
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
  it('returns undefined when varDefsByInput is absent', () => {
    const service = makeService();
    expect(resolveFieldMeta(service, 'aws-s3', 'bucket_arn')).toBeUndefined();
  });

  it('resolves label from title', () => {
    const service = makeService({
      varDefsByInput: {
        'aws-s3': { bucket_arn: makeVarDef('bucket_arn', 'text', { title: 'Bucket ARN' }) },
      },
    });
    const meta = resolveFieldMeta(service, 'aws-s3', 'bucket_arn');
    expect(meta?.def.title).toBe('Bucket ARN');
  });

  it('resolves a var under its own input', () => {
    const service = makeService({
      varDefsByInput: {
        'aws-s3': { bucket_arn: makeVarDef('bucket_arn', 'text') },
      },
    });
    expect(resolveFieldMeta(service, 'aws-s3', 'bucket_arn')).toBeDefined();
  });

  it('returns undefined when activeInput does not match', () => {
    const service = makeService({
      varDefsByInput: {
        'aws-s3': { bucket_arn: makeVarDef('bucket_arn', 'text') },
      },
    });
    expect(resolveFieldMeta(service, 'aws-cloudwatch', 'bucket_arn')).toBeUndefined();
  });

  it('falls back to first-match scan when activeInput is null', () => {
    const service = makeService({
      varDefsByInput: {
        'aws-s3': { bucket_arn: makeVarDef('bucket_arn', 'text') },
      },
    });
    expect(resolveFieldMeta(service, null, 'bucket_arn')).toBeDefined();
  });

  it('allows two inputs to each hold a var of the same name independently', () => {
    const s3Def = makeVarDef('queue_url', 'text', { title: 'S3 Queue' });
    const cwDef = makeVarDef('queue_url', 'text', { title: 'CW Queue' });
    const service = makeService({
      varDefsByInput: {
        'aws-s3': { queue_url: s3Def },
        'aws-cloudwatch': { queue_url: cwDef },
      },
    });
    expect(resolveFieldMeta(service, 'aws-s3', 'queue_url')?.def.title).toBe('S3 Queue');
    expect(resolveFieldMeta(service, 'aws-cloudwatch', 'queue_url')?.def.title).toBe('CW Queue');
  });

  it('sets isBool true for type bool', () => {
    const service = makeService({
      varDefsByInput: {
        'aws-s3': { collect_s3_logs: makeVarDef('collect_s3_logs', 'bool') },
      },
    });
    const meta = resolveFieldMeta(service, 'aws-s3', 'collect_s3_logs');
    expect(meta?.isBool).toBe(true);
  });

  it('sets multi true for multi vars', () => {
    const service = makeService({
      varDefsByInput: {
        'aws-s3': { tags: makeVarDef('tags', 'text', { multi: true }) },
      },
    });
    const meta = resolveFieldMeta(service, 'aws-s3', 'tags');
    expect(meta?.multi).toBe(true);
  });
});

describe('toTyped / toDraft', () => {
  const boolMeta = resolveFieldMeta(
    makeService({ varDefsByInput: { 'aws-s3': { f: makeVarDef('f', 'bool') } } }),
    'aws-s3',
    'f'
  )!;
  const multiMeta = resolveFieldMeta(
    makeService({ varDefsByInput: { 'aws-s3': { f: makeVarDef('f', 'text', { multi: true }) } } }),
    'aws-s3',
    'f'
  )!;
  const textMeta = resolveFieldMeta(
    makeService({ varDefsByInput: { 'aws-s3': { f: makeVarDef('f', 'text') } } }),
    'aws-s3',
    'f'
  )!;

  it('toTyped: bool string "true" → true', () => {
    expect(toTyped('true', boolMeta)).toBe(true);
  });

  it('toTyped: bool typed true → true (SO resume path: stored boolean passes through)', () => {
    expect(toTyped(true, boolMeta)).toBe(true);
  });

  it('toTyped: bool typed false → false (SO resume path: stored boolean passes through)', () => {
    expect(toTyped(false, boolMeta)).toBe(false);
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

  it('toTyped: multi already-array returned as-is (SO resume path)', () => {
    expect(toTyped(['us-east-1', 'eu-west-1'], multiMeta)).toEqual(['us-east-1', 'eu-west-1']);
  });

  it('toTyped: multi empty → empty array', () => {
    expect(toTyped('', multiMeta)).toEqual([]);
  });

  it('toTyped: text already-array joins with comma (structural field fallback)', () => {
    expect(toTyped(['a', 'b'], textMeta)).toBe('a,b');
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
      varDefsByInput: {
        'aws-s3': {
          region: makeVarDef('region', 'text'),
          bucket_arn: makeVarDef('bucket_arn', 'text'),
        },
      },
    });
    const result = getRequiredTextFields(service, 'aws-s3');
    expect(result).not.toContain('region');
    expect(result).toContain('bucket_arn');
  });

  it('excludes vars belonging to a different input', () => {
    const service = makeService({
      requiredConfig: ['bucket_arn', 'log_group_arn'],
      varDefsByInput: {
        'aws-s3': { bucket_arn: makeVarDef('bucket_arn', 'text') },
        'aws-cloudwatch': { log_group_arn: makeVarDef('log_group_arn', 'text') },
      },
    });
    const result = getRequiredTextFields(service, 'aws-cloudwatch');
    expect(result).not.toContain('bucket_arn');
    expect(result).toContain('log_group_arn');
  });

  it('excludes bool vars', () => {
    const service = makeService({
      requiredConfig: ['collect_s3_logs'],
      varDefsByInput: {
        'aws-s3': { collect_s3_logs: makeVarDef('collect_s3_logs', 'bool') },
      },
    });
    expect(getRequiredTextFields(service, 'aws-s3')).not.toContain('collect_s3_logs');
  });

  it('returns empty array when no varDefsByInput present', () => {
    const service = makeService({ requiredConfig: ['bucket_arn'] });
    expect(getRequiredTextFields(service, 'aws-s3')).toEqual([]);
  });
});

describe('getFlyoutFields', () => {
  it('excludes bool vars', () => {
    const service = makeService({
      requiredConfig: ['collect_s3_logs'],
      varDefsByInput: {
        'aws-s3': { collect_s3_logs: makeVarDef('collect_s3_logs', 'bool') },
      },
    });
    expect(getFlyoutFields(service, 'aws-s3')).not.toContain('collect_s3_logs');
  });

  it('excludes vars belonging to a different input', () => {
    const service = makeService({
      requiredConfig: ['bucket_arn', 'log_group_arn'],
      varDefsByInput: {
        'aws-s3': { bucket_arn: makeVarDef('bucket_arn', 'text') },
        'aws-cloudwatch': { log_group_arn: makeVarDef('log_group_arn', 'text') },
      },
    });
    expect(getFlyoutFields(service, 'aws-cloudwatch')).not.toContain('bucket_arn');
    expect(getFlyoutFields(service, 'aws-cloudwatch')).toContain('log_group_arn');
  });

  it('includes fields from optionalConfig', () => {
    const service = makeService({
      requiredConfig: [],
      optionalConfig: ['queue_url'],
      varDefsByInput: {
        'aws-s3': { queue_url: makeVarDef('queue_url', 'text') },
      },
    });
    expect(getFlyoutFields(service, 'aws-s3')).toContain('queue_url');
  });
});

describe('getMissingSourceGroup', () => {
  const opt = (name: string) => makeVarDef(name, 'text', { required: false });
  const agentView = makeService({
    ecfSettings: { requiredConfig: [], dataStreams: [], inputs: [], defaultEnabledInputs: [] },
    varDefsByInput: {
      'aws-s3': {
        bucket_arn: opt('bucket_arn'),
        access_point_arn: opt('access_point_arn'),
        queue_url: opt('queue_url'),
      },
      'aws-cloudwatch': {
        log_group_arn: opt('log_group_arn'),
        log_group_name: opt('log_group_name'),
        log_group_name_prefix: opt('log_group_name_prefix'),
      },
    },
  });

  it.each([
    ['aws-s3', ['bucket_arn', 'access_point_arn', 'queue_url'], 'queue_url'],
    [
      'aws-cloudwatch',
      ['log_group_arn', 'log_group_name', 'log_group_name_prefix'],
      'log_group_name',
    ],
  ])('%s: reports the group while none is filled, and nothing once one is', (input, group, alt) => {
    expect(getMissingSourceGroup(agentView, input, {})).toEqual(group);
    expect(getMissingSourceGroup(agentView, input, { [group[0]]: '' })).toEqual(group);
    expect(getMissingSourceGroup(agentView, input, { [group[0]]: [] })).toEqual(group);
    expect(getMissingSourceGroup(agentView, input, { [group[0]]: ['arn:x'] })).toBeUndefined();
    expect(getMissingSourceGroup(agentView, input, { [alt]: 'value' })).toBeUndefined();
  });

  it('does not apply to the ECF view, to non ECF-capable services or to other inputs', () => {
    expect(
      getMissingSourceGroup({ ...agentView, settingsScope: 'ecf' }, 'aws-s3', {})
    ).toBeUndefined();
    expect(
      getMissingSourceGroup({ ...agentView, ecfSettings: undefined }, 'aws-s3', {})
    ).toBeUndefined();
    expect(getMissingSourceGroup(agentView, 'httpjson', {})).toBeUndefined();
  });
});

describe('S3 collection mode (collect_s3_logs)', () => {
  const opt = (name: string) => makeVarDef(name, 'text', { required: false });
  const s3Defs = {
    collect_s3_logs: makeVarDef('collect_s3_logs', 'bool', { default: false }),
    bucket_arn: opt('bucket_arn'),
    access_point_arn: opt('access_point_arn'),
    queue_url: opt('queue_url'),
  };
  const agentView = makeService({
    ecfSettings: { requiredConfig: [], dataStreams: [], inputs: [], defaultEnabledInputs: [] },
    varDefsByInput: { 'aws-s3': s3Defs },
  });

  describe('shouldDefaultCollectS3Logs', () => {
    it.each(['bucket_arn', 'access_point_arn'])('turns the toggle on for a %s alone', (name) => {
      expect(shouldDefaultCollectS3Logs(agentView, 'aws-s3', { [name]: 'arn:x' })).toBe(true);
      expect(shouldDefaultCollectS3Logs(agentView, 'aws-s3', { [name]: ['arn:x'] })).toBe(true);
    });

    it('leaves the toggle alone without an ARN, with only a queue URL, or once the user chose', () => {
      expect(shouldDefaultCollectS3Logs(agentView, 'aws-s3', {})).toBe(false);
      expect(shouldDefaultCollectS3Logs(agentView, 'aws-s3', { queue_url: 'https://q' })).toBe(
        false
      );
      expect(
        shouldDefaultCollectS3Logs(agentView, 'aws-s3', {
          bucket_arn: 'arn:x',
          collect_s3_logs: 'false',
        })
      ).toBe(false);
    });
  });

  describe('getMissingSourceGroup follows the collection mode', () => {
    it('with the toggle on, needs a bucket or access-point ARN, not a queue URL', () => {
      const vars = { collect_s3_logs: 'true', queue_url: 'https://q' };
      expect(getMissingSourceGroup(agentView, 'aws-s3', vars)).toEqual([
        'bucket_arn',
        'access_point_arn',
      ]);
      expect(
        getMissingSourceGroup(agentView, 'aws-s3', { collect_s3_logs: true, access_point_arn: 'x' })
      ).toBeUndefined();
    });

    it('with the toggle off, needs a queue URL, not an ARN', () => {
      expect(
        getMissingSourceGroup(agentView, 'aws-s3', { collect_s3_logs: 'false', bucket_arn: 'x' })
      ).toEqual(['queue_url']);
      expect(
        getMissingSourceGroup(agentView, 'aws-s3', { collect_s3_logs: 'false', queue_url: 'q' })
      ).toBeUndefined();
    });

    it('with the toggle unset, accepts either kind of source and reports the whole group otherwise', () => {
      expect(getMissingSourceGroup(agentView, 'aws-s3', { queue_url: 'q' })).toBeUndefined();
      expect(getMissingSourceGroup(agentView, 'aws-s3', { access_point_arn: 'x' })).toBeUndefined();
      expect(getMissingSourceGroup(agentView, 'aws-s3', {})).toEqual([
        'bucket_arn',
        'access_point_arn',
        'queue_url',
      ]);
    });
  });
});
