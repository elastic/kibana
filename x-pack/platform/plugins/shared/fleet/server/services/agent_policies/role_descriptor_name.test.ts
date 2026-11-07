/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toRoleDescriptorName } from './role_descriptor_name';

const VALID_NAME = /^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x7e])?$/;

describe('toRoleDescriptorName()', () => {
  it.each([
    ['a uuid', '550e8400-e29b-41d4-a716-446655440000'],
    ['dots, underscores and hyphens', 'my_policy.v2-test'],
    ['internal ASCII spaces', 'aws ec2 eu-west-3-synthetics-default-d9b5d343'],
    ['slashes, colons and other punctuation', 'a/b:c@d+e(f)'],
    ['a single character', 'a'],
  ])('keeps %s unchanged', (_label, id) => {
    expect(toRoleDescriptorName(id)).toBe(id);
  });

  it.each([
    ['a leading space', ' leading-space'],
    ['a trailing space', 'trailing-space '],
    ['a tab', 'with\ttab'],
    ['accented characters', 'monitor-é-default-loc'],
    ['CJK characters', 'モニター-default-loc'],
    ['a no-break space', 'aws ec2-synthetics-default'],
    ['an emoji', 'launch 🚀 check'],
    ['only whitespace', '   '],
    ['an empty string', ''],
  ])('returns a valid name for an ID with %s', (_label, id) => {
    const name = toRoleDescriptorName(id);

    expect(name).not.toBe(id);
    expect(name).toMatch(VALID_NAME);
  });

  it('is deterministic', () => {
    const id = 'monitor-é-default-loc';

    expect(toRoleDescriptorName(id)).toBe(toRoleDescriptorName(id));
  });

  it('keeps a readable ASCII prefix of the original ID', () => {
    expect(toRoleDescriptorName('aws ec2-synthetics-default')).toMatch(
      /^aws_ec2-synthetics-default-[0-9a-f]{16}$/
    );
  });

  it('gives different IDs that sanitize to the same prefix different names', () => {
    expect(toRoleDescriptorName('monitor-é')).not.toBe(toRoleDescriptorName('monitor-ü'));
  });

  it('bounds the length of the readable prefix', () => {
    const name = toRoleDescriptorName(`${'x'.repeat(300)}é`);

    expect(name).toHaveLength(64 + 1 + 16);
    expect(name).toMatch(VALID_NAME);
  });
});
