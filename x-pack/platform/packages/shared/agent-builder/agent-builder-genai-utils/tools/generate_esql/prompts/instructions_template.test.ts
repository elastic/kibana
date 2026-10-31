/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { _loadDocumentation, EsqlDocEntry } from '../documentation/load_doc';
import { getEsqlInstructions } from './instructions_template';

/**
 * The ES|QL generation regression suite measures the generated query against a
 * reference answer. Each case below pins one guidance clause that a measured
 * deviation class depends on, so a silent rewrite of the instructions cannot
 * drop it again.
 */
describe('getEsqlInstructions', () => {
  const instructions = getEsqlInstructions();

  it('asks for equality on values that were stated exactly', () => {
    expect(instructions).toMatch(/stated value|specific value/i);
    expect(instructions).toContain('==');
    expect(instructions).toMatch(/Do not replace an exact value/);
    ['LIKE', 'RLIKE', 'MATCH', 'CONTAINS'].forEach((fn) => {
      expect(instructions).toContain(fn);
    });
  });

  it('requires every grouping dimension the request names', () => {
    expect(instructions).toMatch(/grouping dimension/i);
    expect(instructions).toMatch(/STATS \.\.\. BY/);
  });

  it('requires thresholds on aggregated values to be applied after STATS', () => {
    expect(instructions).toMatch(/after\*\*? the|after the/i);
    expect(instructions).toMatch(/cannot reference an aggregate column/);
  });

  it('keeps the source the user named and forbids inventing one', () => {
    expect(instructions).toMatch(/index pattern/i);
    expect(instructions).toMatch(/narrower source/i);
    expect(instructions).toMatch(/not exist/i);
  });

  it('states that pagination is unsupported', () => {
    expect(instructions).toContain('OFFSET');
    expect(instructions).toMatch(/[Pp]agination is not supported/);
  });

  it('states that window functions do not exist', () => {
    expect(instructions).toContain('ROW_NUMBER');
    expect(instructions).toMatch(/[Ww]indow functions do not exist/);
  });

  it('still honours the row limit and named-parameter options', () => {
    expect(getEsqlInstructions({ defaultLimit: 42 })).toContain('LIMIT 42');
    expect(getEsqlInstructions({ disableNamedParams: true })).not.toContain(
      '## Using named parameters'
    );
    expect(getEsqlInstructions()).toContain('## Using named parameters');
  });
});

describe('ES|QL documentation shown to the model', () => {
  it('names the unsupported query capabilities', async () => {
    const syntaxDoc = (await _loadDocumentation()).getDocContent(EsqlDocEntry.syntax);

    expect(syntaxDoc).toContain('OFFSET');
    expect(syntaxDoc).toContain('ROW_NUMBER');
    expect(syntaxDoc).toMatch(/[Pp]agination/);
  });
});
