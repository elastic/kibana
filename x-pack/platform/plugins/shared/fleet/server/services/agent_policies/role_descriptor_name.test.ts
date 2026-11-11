/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRoleDescriptorNames } from './role_descriptor_name';

const VALID_NAME = /^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x7e])?$/;

const nameOf = (id: string) => getRoleDescriptorNames([id])[0];

describe('getRoleDescriptorNames()', () => {
  it('returns an empty list for no package policies', () => {
    expect(getRoleDescriptorNames([])).toEqual([]);
  });

  it.each([
    ['a uuid', '550e8400-e29b-41d4-a716-446655440000'],
    ['dots, underscores and hyphens', 'my_policy.v2-test'],
    ['internal ASCII spaces', 'aws ec2 eu-west-3-synthetics-default-d9b5d343'],
    ['slashes, colons and other punctuation', 'a/b:c@d+e(f)'],
    ['a single character', 'a'],
  ])('keeps %s unchanged', (_label, id) => {
    expect(nameOf(id)).toBe(id);
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
    const name = nameOf(id);

    expect(name).not.toBe(id);
    expect(name).toMatch(VALID_NAME);
  });

  it('is deterministic', () => {
    const id = 'monitor-é-default-loc';

    expect(nameOf(id)).toBe(nameOf(id));
  });

  it('keeps a readable ASCII prefix of the original ID', () => {
    expect(nameOf('aws ec2-synthetics-default')).toMatch(
      /^aws_ec2-synthetics-default-[0-9a-f]{16}$/
    );
  });

  it('gives different IDs that sanitize to the same prefix different names', () => {
    const [first, second] = getRoleDescriptorNames(['monitor-é', 'monitor-ü']);

    expect(first).not.toBe(second);
  });

  it('bounds the length of the readable prefix', () => {
    const name = nameOf(`${'x'.repeat(300)}é`);

    expect(name).toHaveLength(64 + 1 + 16);
    expect(name).toMatch(VALID_NAME);
  });

  it('keeps the order of the given IDs', () => {
    const names = getRoleDescriptorNames(['b-valid', 'monitor-é', 'a-valid']);

    expect(names[0]).toBe('b-valid');
    expect(names[1]).toMatch(/^monitor-_-[0-9a-f]{16}$/);
    expect(names[2]).toBe('a-valid');
  });

  describe('collisions with other package policy IDs', () => {
    const invalidId = 'monitor-é';

    it('keeps a valid ID that equals the generated name of an invalid ID', () => {
      const generated = nameOf(invalidId);

      const [invalidName, validName] = getRoleDescriptorNames([invalidId, generated]);

      expect(validName).toBe(generated);
      expect(invalidName).not.toBe(generated);
      expect(invalidName).toMatch(VALID_NAME);
    });

    it('resolves repeated collisions', () => {
      const first = nameOf(invalidId);
      const [second] = getRoleDescriptorNames([invalidId, first]);

      const names = getRoleDescriptorNames([invalidId, first, second]);

      expect(names.slice(1)).toEqual([first, second]);
      expect(new Set(names).size).toBe(3);
    });

    it('does not depend on the order of the package policies', () => {
      const generated = nameOf(invalidId);
      const ids = [invalidId, generated, 'monitor-ü'];

      const forward = getRoleDescriptorNames(ids);
      const reversed = getRoleDescriptorNames([...ids].reverse()).reverse();

      expect(reversed).toEqual(forward);
    });

    it('returns the same name for the same invalid ID listed twice', () => {
      const [first, second] = getRoleDescriptorNames([invalidId, invalidId]);

      expect(first).toBe(second);
    });
  });
});
