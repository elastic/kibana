/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countWorkflowYamlLineChanges } from './count_workflow_yaml_line_changes';

describe('countWorkflowYamlLineChanges', () => {
  it('returns 0 for identical yaml', () => {
    expect(countWorkflowYamlLineChanges('name: same\n', 'name: same\n')).toBe(0);
  });

  it('counts a single line change as one hunk', () => {
    expect(countWorkflowYamlLineChanges('name: original\n', 'name: current\n')).toBe(1);
  });

  it('counts separated edits as separate hunks', () => {
    const baseline = ['name: original', 'enabled: true', 'description: old', 'steps: []'].join(
      '\n'
    );
    const target = ['name: updated', 'enabled: true', 'description: new', 'steps: []'].join('\n');

    expect(countWorkflowYamlLineChanges(`${baseline}\n`, `${target}\n`)).toBe(2);
  });
});
