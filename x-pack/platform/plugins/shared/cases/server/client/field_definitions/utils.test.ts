/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFieldDefinitionIdentity } from './utils';

describe('parseFieldDefinitionIdentity', () => {
  it('extracts name and type from a text field', () => {
    expect(
      parseFieldDefinitionIdentity('name: my_field\ncontrol: INPUT_TEXT\ntype: keyword\n')
    ).toEqual({ name: 'my_field', type: 'keyword' });
  });

  it('extracts name and type from a number field', () => {
    expect(
      parseFieldDefinitionIdentity('name: my_number\ncontrol: INPUT_NUMBER\ntype: integer\n')
    ).toEqual({ name: 'my_number', type: 'integer' });
  });

  it('extracts name and type from a toggle field', () => {
    expect(
      parseFieldDefinitionIdentity('name: my_toggle\ncontrol: TOGGLE\ntype: boolean\n')
    ).toEqual({ name: 'my_toggle', type: 'boolean' });
  });

  it('normalizes the defaulted type of a display-only markdown field', () => {
    expect(
      parseFieldDefinitionIdentity(
        'name: my_note\ncontrol: MARKDOWN\nmetadata:\n  content: "hello"\n'
      )
    ).toEqual({ name: 'my_note', type: 'keyword' });
  });

  it('returns undefined for YAML that fails schema validation', () => {
    expect(
      parseFieldDefinitionIdentity('name: my_field\ncontrol: NOT_A_CONTROL\n')
    ).toBeUndefined();
  });

  it('returns undefined for unparseable YAML', () => {
    expect(parseFieldDefinitionIdentity('not: [valid')).toBeUndefined();
  });
});
