/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInapplicableValidationRuleMarkers } from './validate_field_validation_rules';

const rulesFlagged = (yaml: string): string[] =>
  getInapplicableValidationRuleMarkers(yaml).map((marker) => {
    const match = marker.message.match(/"([^"]+)"/);
    return match ? match[1] : marker.message;
  });

describe('getInapplicableValidationRuleMarkers', () => {
  it('flags length/pattern rules on a Number field but keeps min/max', () => {
    const yaml = `name: T
fields:
  - name: risk
    control: INPUT_NUMBER
    type: integer
    validation:
      required: true
      min: 0
      max: 100
      min_length: 5`;

    const flagged = rulesFlagged(yaml);

    expect(flagged).toEqual(['min_length']);
  });

  it('flags min/max on a Text field but keeps pattern and length rules', () => {
    const yaml = `name: T
fields:
  - name: ticket
    control: INPUT_TEXT
    type: keyword
    validation:
      max_length: 10
      pattern:
        regex: "^INC-"
      min: 3`;

    const flagged = rulesFlagged(yaml);

    expect(flagged).toEqual(['min']);
  });

  it('flags length/numeric rules on controls that honor none of them but never pattern', () => {
    const yaml = `name: T
fields:
  - name: region
    control: SELECT_BASIC
    type: keyword
    metadata:
      options: [a, b]
    validation:
      required: true
      pattern:
        regex: "x"
      min: 1`;

    const flagged = rulesFlagged(yaml);

    // `pattern` is enforced at runtime for every control, so it must not be flagged; only the
    // numeric/length rules that truly no-op on a Select are surfaced.
    expect(flagged.sort()).toEqual(['min']);
  });

  it('never flags pattern on controls that are neither text nor number', () => {
    const yaml = `name: T
fields:
  - name: region
    control: SELECT_BASIC
    type: keyword
    metadata:
      options: [a, b]
    validation:
      pattern:
        regex: "^a"
  - name: due
    control: DATE_PICKER
    type: date
    validation:
      pattern:
        regex: "2024"
  - name: escalate
    control: TOGGLE
    type: boolean
    validation:
      pattern:
        regex: "true"`;

    expect(getInapplicableValidationRuleMarkers(yaml)).toEqual([]);
  });

  it('marks the rule as a warning and includes the human-readable field type', () => {
    const yaml = `name: T
fields:
  - name: risk
    control: INPUT_NUMBER
    type: integer
    validation:
      min_length: 5`;

    const markers = getInapplicableValidationRuleMarkers(yaml);

    expect(markers).toHaveLength(1);
    expect(markers[0].severity).toBe('warning');
    expect(markers[0].message).toContain('Number Input');
  });

  it('does not flag applicable or always-valid rules', () => {
    const yaml = `name: T
fields:
  - name: notes
    control: TEXTAREA
    type: keyword
    validation:
      required: true
      required_on_close: true
      min_length: 20
      max_length: 500
      pattern:
        regex: ".+"`;

    expect(getInapplicableValidationRuleMarkers(yaml)).toEqual([]);
  });

  it('ignores $ref fields and unknown controls', () => {
    const yaml = `name: T
fields:
  - $ref: root_cause
    metadata:
      default: infra
  - name: mystery
    control: NOT_A_REAL_CONTROL
    type: keyword
    validation:
      min: 1`;

    expect(getInapplicableValidationRuleMarkers(yaml)).toEqual([]);
  });
});
