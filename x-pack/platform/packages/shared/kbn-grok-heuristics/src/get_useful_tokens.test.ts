/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getUsefulTokens,
  getReviewFields,
  getGrokProcessor,
  mergeGrokProcessors,
  type NamedColumn,
} from './get_useful_tokens';
import { PATTERN_PRECEDENCE } from './constants';
import type { NormalizedColumn } from './normalize_tokens';
import type { ReviewFields, GrokProcessorResult, TokenTuple } from './get_useful_tokens';

/**
 * Helper function to get the index of a pattern from PATTERN_PRECEDENCE.
 */
function getPatternIndex(pattern: string) {
  return PATTERN_PRECEDENCE.indexOf(pattern);
}

describe('getUsefulTokens', () => {
  it('handles empty input', () => {
    const result = getUsefulTokens([], '\\s');
    expect(result).toEqual({ columns: [], usefulColumns: [], usefulTokens: [] });
  });

  it('handles columns with collapsible tokens only', () => {
    const roots: NormalizedColumn[] = [
      {
        tokens: [{ values: [], patterns: [getPatternIndex('GREEDYDATA')], excludedPatterns: [] }],
        whitespace: { minLeading: 0, maxLeading: 0, minTrailing: 0, maxTrailing: 0 },
      },
    ];
    const result = getUsefulTokens(roots, '\\s');
    expect(result.usefulTokens).toEqual([['GREEDYDATA', undefined]]);
  });

  it('handles columns with variable whitespace', () => {
    const roots: NormalizedColumn[] = [
      {
        tokens: [
          {
            values: ['value1'],
            patterns: [getPatternIndex('WORD')],
            excludedPatterns: [getPatternIndex('GREEDYDATA')],
          },
        ],
        whitespace: { minLeading: 1, maxLeading: 2, minTrailing: 1, maxTrailing: 2 },
      },
    ];
    const result = getUsefulTokens(roots, '\\s');
    expect(result.usefulTokens).toEqual([
      ['\\s+', undefined],
      ['WORD', 'field_1'],
      ['\\s+', undefined],
    ]);
  });

  it('handles columns with freeform text', () => {
    const roots: NormalizedColumn[] = [
      {
        tokens: [
          { values: ['text'], patterns: [getPatternIndex('GREEDYDATA')], excludedPatterns: [] },
        ],
        whitespace: { minLeading: 0, maxLeading: 0, minTrailing: 0, maxTrailing: 0 },
      },
    ];
    const result = getUsefulTokens(roots, '\\s');
    expect(result.usefulTokens).toEqual([['GREEDYDATA', undefined]]);
  });
});

describe('getReviewFields', () => {
  it('handles empty columns', () => {
    const result = getReviewFields([], 5);
    expect(result).toEqual({});
  });

  it('handles tokens with no values', () => {
    const columns: NamedColumn[] = [{ tokens: [{ id: 'field_1', pattern: 'WORD', values: [] }] }];
    const result = getReviewFields(columns, 5);
    expect(result).toEqual({ field_1: { grok_component: 'WORD', example_values: [] } });
  });

  it('handles tokens with duplicate values', () => {
    const columns: NamedColumn[] = [
      { tokens: [{ id: 'field_1', pattern: 'WORD', values: ['value1', 'value1', 'value2'] }] },
    ];
    const result = getReviewFields(columns, 5);
    expect(result).toEqual({
      field_1: { grok_component: 'WORD', example_values: ['value1', 'value2'] },
    });
  });
});

describe('getGrokProcessor', () => {
  it('handles empty useful tokens', () => {
    const reviewFields: ReviewFields = {};
    const reviewResult = { log_source: 'Test Log', fields: [] };
    const result = getGrokProcessor([], reviewFields, reviewResult);
    expect(result).toEqual({ description: 'Test Log', patterns: [''], pattern_definitions: {} });
  });

  it('handles review fields with missing GROK components', () => {
    const usefulTokens: TokenTuple[] = [['WORD', 'field_1']];
    const reviewFields: ReviewFields = { field_1: { grok_component: 'WORD', example_values: [] } };
    const reviewResult = { log_source: 'Test Log', fields: [] };
    const result = getGrokProcessor(usefulTokens, reviewFields, reviewResult);
    expect(result.patterns).toEqual(['%{WORD:field_1}']);
  });

  it('handles review results with multiple columns for a single field', () => {
    const usefulTokens: TokenTuple[] = [
      ['WORD', 'field_1'],
      ['INT', 'field_2'],
    ];
    const reviewFields: ReviewFields = {
      field_1: { grok_component: 'WORD', example_values: [] },
      field_2: { grok_component: 'INT', example_values: [] },
    };
    const reviewResult = {
      log_source: 'Test Log',
      fields: [
        {
          name: 'field_combined',
          columns: ['field_1', 'field_2'],
          grok_components: ['WORD', 'INT'],
        },
      ],
    };
    const result = getGrokProcessor(usefulTokens, reviewFields, reviewResult);
    expect(result.pattern_definitions).toEqual({ CUSTOM_FIELD_COMBINED: '%{WORD}%{INT}' });
  });
});

describe('mergeGrokProcessors', () => {
  it('handles single processor input', () => {
    const processors: GrokProcessorResult[] = [
      { description: 'Test Log', patterns: ['%{WORD:field_1}'], pattern_definitions: {} },
    ];
    const result = mergeGrokProcessors(processors);
    expect(result).toEqual(processors[0]);
  });

  it('handles conflicting pattern definitions across processors', () => {
    const processors: GrokProcessorResult[] = [
      {
        description: 'Log A',
        patterns: ['%{WORD:field_1}'],
        pattern_definitions: { CUSTOM_PATTERN: '%{WORD}' },
      },
      {
        description: 'Log B',
        patterns: ['%{INT:field_2}'],
        pattern_definitions: { CUSTOM_PATTERN: '%{INT}' },
      },
    ];
    const result = mergeGrokProcessors(processors);
    expect(result.pattern_definitions).toEqual({
      CUSTOM_PATTERN: '%{WORD}',
      CUSTOM_PATTERN2: '%{INT}',
    });
  });
});
