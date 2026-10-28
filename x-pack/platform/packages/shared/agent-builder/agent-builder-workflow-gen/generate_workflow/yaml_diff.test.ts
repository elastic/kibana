/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createYamlDiff } from './yaml_diff';

describe('createYamlDiff', () => {
  it('returns only the changed hunk with context, without the file header', () => {
    const before = ['a: 1', 'b: 2', 'c: 3', 'd: 4', 'e: 5', 'f: 6', 'g: 7', 'h: 8', ''].join('\n');
    const after = before.replace('e: 5', 'e: 50');

    const diff = createYamlDiff(before, after);

    expect(diff).not.toContain('workflow.yaml');
    expect(diff).not.toContain('a: 1');
    expect(diff).toContain('-e: 5');
    expect(diff).toContain('+e: 50');
    expect(diff.startsWith('@@')).toBe(true);
  });
});
