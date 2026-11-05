/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { getVariableInsertText } from './get_variable_insert_text';

const NAME = 'inputs.payload.policyId';
const TEMPLATE = `{{ ${NAME} }}`;

const insert = (before: string, after = ''): string =>
  `${before}${getVariableInsertText(NAME, before, after)}${after}`;

describe('getVariableInsertText', () => {
  it.each([
    ['an empty map value', 'subject: ', ''],
    ['an empty map value followed by other keys', 'subject: ', '\nmessage: hi\n'],
    ['an empty list item', 'to:\n  - ', ''],
  ])('quotes the template at the start of %s', (_, before, after) => {
    expect(getVariableInsertText(NAME, before, after)).toBe(`"${TEMPLATE}"`);
  });

  it.each([
    ['a double-quoted value', 'subject: "', '"'],
    ['a single-quoted value', "subject: '", "'"],
    ['a quoted list item', 'to:\n  - "', '"'],
    ['a literal block', 'message: |\n  {% for alert in inputs.payload.alerts %}\n  - ', '\n'],
    ['a folded block', 'message: >\n  Policy ', '\n'],
    ['a plain value', 'subject: Policy ', ''],
  ])('keeps the template bare inside %s', (_, before, after) => {
    expect(getVariableInsertText(NAME, before, after)).toBe(TEMPLATE);
  });

  it('produces a string value where a bare template would parse as a flow mapping', () => {
    expect(parse(insert('subject: '))).toEqual({ subject: TEMPLATE });
    expect(parse(insert('to:\n  - '))).toEqual({ to: [TEMPLATE] });
  });

  it('keeps block scalar content intact when inserting inside a literal block', () => {
    expect(parse(insert('message: |\n  - ', '\n'))).toEqual({ message: `- ${TEMPLATE}\n` });
  });
});
