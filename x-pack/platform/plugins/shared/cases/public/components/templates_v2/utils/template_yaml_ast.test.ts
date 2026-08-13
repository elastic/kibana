/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createOffsetToPosition,
  getDefinedFieldNames,
  getFieldItemMaps,
  parseTemplateDocument,
} from './template_yaml_ast';

describe('parseTemplateDocument', () => {
  it('returns null for empty, non-object, or malformed YAML', () => {
    expect(parseTemplateDocument('')).toBeNull();
    expect(parseTemplateDocument('   ')).toBeNull();
    expect(parseTemplateDocument('- just\n- a\n- list')).toBeNull();
    expect(parseTemplateDocument('name: [unterminated')).toBeNull();
  });

  it('returns a document for a valid mapping', () => {
    expect(parseTemplateDocument('name: T\nfields: []')).not.toBeNull();
  });
});

describe('getDefinedFieldNames', () => {
  it('collects inline names and $ref effective names (alias or referenced name)', () => {
    const doc = parseTemplateDocument(`name: T
fields:
  - name: inline_one
    control: INPUT_TEXT
    type: keyword
  - $ref: root_cause
  - $ref: severity
    name: incident_severity`)!;

    const names = getDefinedFieldNames(getFieldItemMaps(doc));

    expect(names).toEqual(new Set(['inline_one', 'root_cause', 'incident_severity']));
  });
});

describe('createOffsetToPosition', () => {
  it('maps offsets to 1-based line and column', () => {
    const source = 'abc\nde\nf';
    const toPosition = createOffsetToPosition(source);

    expect(toPosition(0)).toEqual({ lineNumber: 1, column: 1 });
    expect(toPosition(3)).toEqual({ lineNumber: 1, column: 4 });
    expect(toPosition(4)).toEqual({ lineNumber: 2, column: 1 });
    expect(toPosition(7)).toEqual({ lineNumber: 3, column: 1 });
  });
});
