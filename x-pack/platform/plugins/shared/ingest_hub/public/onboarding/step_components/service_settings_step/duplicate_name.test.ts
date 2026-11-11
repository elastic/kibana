/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import {
  buildDuplicateName,
  getDuplicateBaseName,
  getRenamedDuplicate,
  isDuplicateNameTaken,
  isGeneratedDuplicateName,
} from './duplicate_name';

describe('buildDuplicateName', () => {
  it('returns baseName [Duplicate] when no collision', () => {
    expect(buildDuplicateName('AWS CloudTrail', [])).toBe('AWS CloudTrail [Duplicate]');
  });

  it('appends index 2 when [Duplicate] is already taken', () => {
    expect(buildDuplicateName('AWS CloudTrail', ['AWS CloudTrail [Duplicate]'])).toBe(
      'AWS CloudTrail [Duplicate 2]'
    );
  });

  it('increments until a free slot is found', () => {
    const existing = [
      'AWS CloudTrail [Duplicate]',
      'AWS CloudTrail [Duplicate 2]',
      'AWS CloudTrail [Duplicate 3]',
    ];
    expect(buildDuplicateName('AWS CloudTrail', existing)).toBe('AWS CloudTrail [Duplicate 4]');
  });

  it('does not collide with unrelated existing names', () => {
    expect(buildDuplicateName('AWS S3', ['AWS CloudTrail [Duplicate]'])).toBe('AWS S3 [Duplicate]');
  });
});

describe('isDuplicateNameTaken', () => {
  it('returns false when name is unique', () => {
    expect(isDuplicateNameTaken('New Name', ['AWS CloudTrail', 'AWS S3'])).toBe(false);
  });

  it('returns true for an exact match', () => {
    expect(isDuplicateNameTaken('AWS CloudTrail', ['AWS CloudTrail', 'AWS S3'])).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isDuplicateNameTaken('aws cloudtrail', ['AWS CloudTrail'])).toBe(true);
  });

  it('trims whitespace before comparing', () => {
    expect(isDuplicateNameTaken('  AWS CloudTrail  ', ['AWS CloudTrail'])).toBe(true);
  });
});

describe('isGeneratedDuplicateName', () => {
  it('recognises the generated names for a base name', () => {
    expect(isGeneratedDuplicateName('aws-1-staging [Duplicate]', 'aws-1-staging')).toBe(true);
    expect(isGeneratedDuplicateName('aws-1-staging [Duplicate 3]', 'aws-1-staging')).toBe(true);
  });

  it('rejects names the user changed or that come from another base name', () => {
    expect(isGeneratedDuplicateName('my copy', 'aws-1-staging')).toBe(false);
    expect(isGeneratedDuplicateName('aws-1-qa [Duplicate]', 'aws-1-staging')).toBe(false);
    expect(isGeneratedDuplicateName('aws-1-staging [Duplicate] x', 'aws-1-staging')).toBe(false);
  });

  it('treats special characters in the base name literally', () => {
    expect(isGeneratedDuplicateName('a.b (c) [Duplicate]', 'a.b (c)')).toBe(true);
    expect(isGeneratedDuplicateName('axb (c) [Duplicate]', 'a.b (c)')).toBe(false);
  });
});

describe('getRenamedDuplicate', () => {
  it('generates the name again for the new base name', () => {
    expect(
      getRenamedDuplicate('aws-1-staging [Duplicate]', ['aws-1-staging'], 'aws-1-qa', ['aws-1'])
    ).toBe('aws-1-qa [Duplicate]');
  });

  it('keeps the new name unique', () => {
    expect(
      getRenamedDuplicate('aws-1-staging [Duplicate]', ['aws-1-staging'], 'aws-1-qa', [
        'aws-1-qa [Duplicate]',
      ])
    ).toBe('aws-1-qa [Duplicate 2]');
  });

  it('keeps a name the user chose', () => {
    expect(getRenamedDuplicate('my copy', ['aws-1-staging'], 'aws-1-qa', [])).toBeUndefined();
  });

  it('keeps the name when the base name did not change', () => {
    expect(getRenamedDuplicate('aws-1 [Duplicate]', ['aws-1'], 'aws-1', ['aws-1'])).toBeUndefined();
  });

  it('finds the generated name among several possible previous base names', () => {
    // Generated with no namespace, while the global namespace has since become `prod`.
    expect(
      getRenamedDuplicate('aws-1 [Duplicate]', ['aws-1-prod', 'aws-1'], 'aws-1-qa', ['aws-1'])
    ).toBe('aws-1-qa [Duplicate]');
  });

  it('keeps the name when it already is the one for the new namespace', () => {
    expect(
      getRenamedDuplicate('aws-1-prod [Duplicate]', ['aws-1-prod', 'aws-1'], 'aws-1-prod', [])
    ).toBeUndefined();
  });
});

describe('getDuplicateBaseName', () => {
  const service = {
    name: 'Amazon EBS',
    packageName: 'aws',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  } as unknown as AwsServiceMatrixEntry;
  const context = {
    integrationName: 'aws-1',
    globalNamespace: 'staging',
    bareNamePackage: 'aws',
    deploymentMethod: 'managed_integration' as const,
  };

  it('is the policy name in the duplicate namespace', () => {
    expect(getDuplicateBaseName(service, 'qa', context)).toBe('aws-1-qa');
  });

  it('uses the global namespace when the duplicate has none', () => {
    expect(getDuplicateBaseName(service, '', context)).toBe('aws-1-staging');
  });

  it('leaves an empty namespace empty when it should not follow the global one', () => {
    expect(getDuplicateBaseName(service, '', context, false)).toBe('aws-1');
  });

  it('keeps the bare integration name in the default namespace', () => {
    expect(getDuplicateBaseName(service, 'default', context)).toBe('aws-1');
  });

  it('is the service name without an integration name', () => {
    expect(getDuplicateBaseName(service, 'qa', { ...context, integrationName: ' ' })).toBe(
      'Amazon EBS'
    );
  });
});
