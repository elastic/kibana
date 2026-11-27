/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { automationNameSchema, findDuplicate, MAX_AUTOMATION_NAME_LENGTH } from './template_params';

describe('findDuplicate', () => {
  it('returns the first value listed twice', () => {
    expect(findDuplicate(['a', 'b', 'a', 'b'])).toBe('a');
  });

  it('returns undefined when every value is distinct', () => {
    expect(findDuplicate(['a', 'b'])).toBeUndefined();
  });
});

describe('automationNameSchema', () => {
  const issues = (name: string): string[] => {
    const result = automationNameSchema.safeParse(name);
    return result.success ? [] : result.error.issues.map(({ message }) => message);
  };

  it('accepts a plain name', () => {
    expect(issues('nightly profiles')).toEqual([]);
  });

  it('rejects a blank name, a slash and an overlong name', () => {
    expect(issues('   ')).toEqual(['name must not be blank or whitespace-only']);
    expect(issues('a/b')).toEqual(['name must not contain a forward slash']);
    expect(issues('x'.repeat(MAX_AUTOMATION_NAME_LENGTH + 1))).toHaveLength(1);
  });
});
