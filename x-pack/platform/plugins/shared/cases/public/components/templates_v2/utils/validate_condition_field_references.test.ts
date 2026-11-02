/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMissingConditionFieldMarkers } from './validate_condition_field_references';

describe('getMissingConditionFieldMarkers', () => {
  it('returns no markers when every referenced field exists', () => {
    const yaml = `name: T
fields:
  - name: incident_type
    control: SELECT_BASIC
    type: keyword
    metadata:
      options: [malware, phishing]
  - name: records_lost
    control: INPUT_NUMBER
    type: long
    display:
      show_when: { field: incident_type, operator: eq, value: malware }`;

    expect(getMissingConditionFieldMarkers(yaml)).toEqual([]);
  });

  it('flags a show_when that references an unknown field', () => {
    const yaml = `name: T
fields:
  - name: incident_type
    control: SELECT_BASIC
    type: keyword
    metadata:
      options: [malware]
  - name: records_lost
    control: INPUT_NUMBER
    type: long
    display:
      show_when: { field: incdent_type, operator: eq, value: malware }`;

    const markers = getMissingConditionFieldMarkers(yaml);

    expect(markers).toHaveLength(1);
    expect(markers[0].severity).toBe('warning');
    expect(markers[0].message).toContain('incdent_type');
    // The marker points at the typo'd reference on the show_when line.
    expect(markers[0].startLineNumber).toBe(12);
  });

  it('flags a required_when that references an unknown field', () => {
    const yaml = `name: T
fields:
  - name: known
    control: INPUT_TEXT
    type: keyword
  - name: notes
    control: INPUT_TEXT
    type: keyword
    validation:
      required_when: { field: does_not_exist, operator: not_empty }`;

    const markers = getMissingConditionFieldMarkers(yaml);

    expect(markers).toHaveLength(1);
    expect(markers[0].message).toContain('does_not_exist');
  });

  it('checks every rule in a compound condition and flags only the unknown ones', () => {
    const yaml = `name: T
fields:
  - name: data_exfiltrated
    control: RADIO_GROUP
    type: keyword
    metadata:
      options: ["Yes", "No"]
  - name: records_lost
    control: INPUT_NUMBER
    type: long
    display:
      show_when:
        combine: all
        rules:
          - { field: data_exfiltrated, operator: eq, value: "Yes" }
          - { field: customer_impacting, operator: eq, value: "true" }`;

    const markers = getMissingConditionFieldMarkers(yaml);

    expect(markers).toHaveLength(1);
    expect(markers[0].message).toContain('customer_impacting');
  });

  it('resolves $ref alias names as defined fields', () => {
    const yaml = `name: T
fields:
  - $ref: root_cause
    name: incident_root_cause
  - name: notes
    control: INPUT_TEXT
    type: keyword
    display:
      show_when: { field: incident_root_cause, operator: not_empty }`;

    expect(getMissingConditionFieldMarkers(yaml)).toEqual([]);
  });

  it('returns no markers for empty, malformed, or fields-less YAML', () => {
    expect(getMissingConditionFieldMarkers('')).toEqual([]);
    expect(getMissingConditionFieldMarkers('name: [unclosed')).toEqual([]);
    expect(getMissingConditionFieldMarkers('name: Just a title')).toEqual([]);
  });
});
