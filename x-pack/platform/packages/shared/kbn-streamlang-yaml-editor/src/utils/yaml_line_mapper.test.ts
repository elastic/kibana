/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapStepsToYamlLines } from './yaml_line_mapper';

describe('mapStepsToYamlLines', () => {
  it('maps if-branch steps to line ranges', () => {
    const yaml = `steps:
  - condition:
      field: status
      eq: active
      steps:
        - action: set
          to: result
          value: yes`;

    const lineMap = mapStepsToYamlLines(yaml);

    // The condition block itself should be mapped
    const conditionIds = Object.keys(lineMap);
    expect(conditionIds.length).toBeGreaterThanOrEqual(2);

    // The nested processor should have a mapping
    const processorEntry = Object.values(lineMap).find((v) => v.lineStart >= 6);
    expect(processorEntry).toBeDefined();
  });

  it('maps else-branch steps to line ranges', () => {
    const yaml = `steps:
  - condition:
      field: status
      eq: active
      steps:
        - action: set
          to: result
          value: yes
      else:
        - action: set
          to: result
          value: no`;

    const lineMap = mapStepsToYamlLines(yaml);

    // Should have 3 entries: condition block, if-branch step, else-branch step
    const ids = Object.keys(lineMap);
    expect(ids).toHaveLength(3);

    // The else-branch step should have a line mapping starting at or after the "else:" line
    const elseBranchEntry = Object.values(lineMap).find((v) => v.lineStart >= 10);
    expect(elseBranchEntry).toBeDefined();
  });

  it('maps multiple else-branch steps', () => {
    const yaml = `steps:
  - condition:
      field: status
      eq: active
      steps:
        - action: set
          to: a
          value: "1"
      else:
        - action: set
          to: b
          value: "2"
        - action: set
          to: c
          value: "3"`;

    const lineMap = mapStepsToYamlLines(yaml);

    // Should have 4 entries: condition, if-step, else-step-1, else-step-2
    expect(Object.keys(lineMap)).toHaveLength(4);
  });

  it('returns empty map for invalid YAML', () => {
    const lineMap = mapStepsToYamlLines('not: valid: yaml: [[[');
    expect(Object.keys(lineMap)).toHaveLength(0);
  });
});
