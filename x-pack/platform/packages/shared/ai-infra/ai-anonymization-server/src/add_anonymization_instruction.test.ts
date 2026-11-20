/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRule } from '@kbn/ai-anonymization-common';
import { addAnonymizationInstruction } from './add_anonymization_instruction';

const regexRule = (overrides: Partial<AnonymizationRule> = {}): AnonymizationRule =>
  ({
    type: 'RegExp',
    enabled: true,
    entityClass: 'IP',
    pattern: '\\d+',
    ...overrides,
  } as AnonymizationRule);

const nerRule = (overrides: Partial<AnonymizationRule> = {}): AnonymizationRule =>
  ({ type: 'NER', enabled: true, modelId: 'model', ...overrides } as AnonymizationRule);

describe('addAnonymizationInstruction', () => {
  it('returns the system prompt unchanged when no rule is enabled', () => {
    expect(addAnonymizationInstruction('You are helpful.', [])).toBe('You are helpful.');
    expect(addAnonymizationInstruction('You are helpful.', [regexRule({ enabled: false })])).toBe(
      'You are helpful.'
    );
  });

  it('keeps the original system prompt and appends the anonymization section', () => {
    const result = addAnonymizationInstruction('You are helpful.', [regexRule()]);

    expect(result.startsWith('You are helpful.')).toBe(true);
    expect(result).toContain('### Anonymization');
  });

  it('gives an example token for each enabled regex class', () => {
    const result = addAnonymizationInstruction('', [
      regexRule({ entityClass: 'IP' } as Partial<AnonymizationRule>),
      regexRule({ entityClass: 'EMAIL' } as Partial<AnonymizationRule>),
      regexRule({ entityClass: 'URL', enabled: false } as Partial<AnonymizationRule>),
    ]);

    expect(result).toContain('`IP_abc123`');
    expect(result).toContain('`EMAIL_abc123`');
    expect(result).not.toContain('URL_abc123');
  });

  it('covers the NER classes when an NER rule is enabled', () => {
    const result = addAnonymizationInstruction('', [nerRule()]);

    for (const entityClass of ['PER', 'LOC', 'ORG', 'MISC']) {
      expect(result).toContain(`\`${entityClass}_abc123\``);
    }
  });

  // The model must give back tokens whole: they are matched by exact string comparison when the
  // response is deanonymized, so a shortened or ellipsized token is never restored. Models do
  // shorten long identifiers to fit table cells unless told not to.
  it('tells the model never to shorten a token, including in tables', () => {
    const result = addAnonymizationInstruction('', [regexRule()]);

    expect(result).toMatch(/never shorten, truncate or abbreviate/);
    expect(result).toMatch(/ellipsis/);
    expect(result).toMatch(/tables/);
  });
});
