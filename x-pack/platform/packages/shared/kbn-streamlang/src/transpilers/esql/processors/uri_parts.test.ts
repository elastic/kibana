/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder, type ESQLAstCommand } from '@kbn/esql-language';
import type { UriPartsProcessor } from '../../../../types/processors';
import { convertUriPartsProcessorToESQL } from './uri_parts';

/**
 * Helper to convert ESQLAstCommand[] to a string for assertion
 */
function commandsToString(commands: ESQLAstCommand[]): string {
  const query = Builder.expression.query(commands);
  return BasicPrettyPrinter.print(query);
}

describe('convertUriPartsProcessorToESQL', () => {
  it('should omit `.original` when keep_original is false', () => {
    const processor: UriPartsProcessor = {
      action: 'uri_parts',
      from: 'message',
      to: 'url',
      keep_original: false,
    };

    const result = commandsToString(convertUriPartsProcessorToESQL(processor));
    expect(result).not.toContain('`url.original`');
  });

  it('should not pre-filter when ignore_missing is true and should CASE-wrap source', () => {
    const processor: UriPartsProcessor = {
      action: 'uri_parts',
      from: 'message',
      to: 'url',
      ignore_missing: true,
    };

    const result = commandsToString(convertUriPartsProcessorToESQL(processor));

    // ignore_missing=true should NOT filter-out docs via WHERE
    expect(result).not.toContain('WHERE NOT(message IS NULL)');

    // instead, the URI_PARTS source should be CASE-wrapped (NULL else branch avoids URI parse warnings)
    expect(result).toContain('CASE(NOT(message IS NULL), message, NULL)');
    expect(result).toContain('URI_PARTS url = CASE(');
  });

  it('should CASE-wrap source when where is provided', () => {
    const processor: UriPartsProcessor = {
      action: 'uri_parts',
      from: 'message',
      to: 'url',
      where: { field: 'active', eq: true },
    };

    const result = commandsToString(convertUriPartsProcessorToESQL(processor));

    // ignore_missing defaults to false for uri_parts, so missing-field behavior is simulated via WHERE
    expect(result).toContain('WHERE NOT(message IS NULL)');

    // Conditional execution is applied by CASE-wrapping the GROK source
    expect(result).toContain('CASE(active == TRUE, message, NULL)');

    // keep_original defaults to true, so it should mirror the same conditional source expression
    expect(result).toContain('`url.original` = CASE(active == TRUE, message, NULL)');
  });

  it('should not emit `.original` even when where is provided and keep_original is false', () => {
    const processor: UriPartsProcessor = {
      action: 'uri_parts',
      from: 'message',
      to: 'url',
      keep_original: false,
      where: { field: 'active', eq: true },
    };

    const result = commandsToString(convertUriPartsProcessorToESQL(processor));
    expect(result).toContain('CASE(active == TRUE, message, NULL)');
    expect(result).not.toContain('`url.original`');
  });
});

