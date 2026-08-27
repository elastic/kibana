/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRequiredNoDefaultMarkers } from './validate_required_field_defaults';
import { parseTemplateDocument } from './template_yaml_ast';

describe('getRequiredNoDefaultMarkers', () => {
  it('flags a required inline field with no metadata.default', () => {
    const yaml = `name: T
fields:
  - name: severity_level
    label: Severity level
    type: keyword
    control: INPUT_TEXT
    validation:
      required: true
`;
    const markers = getRequiredNoDefaultMarkers(yaml);

    expect(markers).toHaveLength(1);
    expect(markers[0].severity).toBe('warning');
    expect(markers[0].message).toContain('"severity_level" is required but has no default value');
    // Anchored on the `required` key line.
    expect(markers[0].startLineNumber).toBe(8);
  });

  it('flags a required field whose default is an empty string', () => {
    const yaml = `name: T
fields:
  - name: notes
    label: Notes
    type: keyword
    control: INPUT_TEXT
    metadata:
      default: ""
    validation:
      required: true
`;
    const markers = getRequiredNoDefaultMarkers(yaml);
    expect(markers).toHaveLength(1);
    expect(markers[0].message).toContain('"notes"');
  });

  it('does not flag a required field that has a default', () => {
    const yaml = `name: T
fields:
  - name: severity_level
    label: Severity level
    type: keyword
    control: INPUT_TEXT
    metadata:
      default: medium
    validation:
      required: true
`;
    expect(getRequiredNoDefaultMarkers(yaml)).toEqual([]);
  });

  it('does not flag optional fields or conditional requirement', () => {
    const yaml = `name: T
fields:
  - name: optional_field
    type: keyword
    control: INPUT_TEXT
    validation:
      required: false
  - name: conditional_field
    type: keyword
    control: INPUT_TEXT
    validation:
      required_when:
        field: optional_field
        equals: x
  - name: close_field
    type: keyword
    control: INPUT_TEXT
    validation:
      required_on_close: true
`;
    expect(getRequiredNoDefaultMarkers(yaml)).toEqual([]);
  });

  it('skips $ref entries — the library definition is warned on at its own authoring surface', () => {
    const yaml = `name: T
fields:
  - $ref: library_field
`;
    expect(getRequiredNoDefaultMarkers(yaml)).toEqual([]);
  });

  it('skips display-only MARKDOWN fields', () => {
    const yaml = `name: T
fields:
  - name: guidance
    control: MARKDOWN
    validation:
      required: true
`;
    expect(getRequiredNoDefaultMarkers(yaml)).toEqual([]);
  });

  it('returns no markers for malformed YAML or a template without fields', () => {
    expect(getRequiredNoDefaultMarkers(': not yaml [')).toEqual([]);
    expect(getRequiredNoDefaultMarkers('name: T\n')).toEqual([]);
  });

  it('reuses a pre-parsed document when provided', () => {
    const yaml = `name: T
fields:
  - name: severity_level
    type: keyword
    control: INPUT_TEXT
    validation:
      required: true
`;
    const doc = parseTemplateDocument(yaml);
    expect(doc).not.toBeNull();

    const markers = getRequiredNoDefaultMarkers(yaml, doc!);
    expect(markers).toHaveLength(1);
  });
});
