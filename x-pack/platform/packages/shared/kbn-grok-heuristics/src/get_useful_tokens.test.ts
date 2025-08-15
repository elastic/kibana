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
  getReviewFields,
  getGrokProcessor,
  mergeGrokProcessors,
  type NamedColumn,
} from './get_useful_tokens';

import type { ReviewFields, GrokProcessorResult, TokenTuple } from './get_useful_tokens';

describe('getReviewFields', () => {
  it('returns only named fields without literal values', () => {
    const columns: NamedColumn[] = [
      {
        tokens: [
          {
            id: 'field_1',
            pattern: 'WORD',
            values: ['value1', 'value2', 'value3'],
          },
          {
            id: undefined,
            pattern: '-',
            values: ['-', '-', '-'],
          },
          {
            id: 'field_2',
            pattern: 'INT',
            values: ['1', '2', '3'],
          },
        ],
        whitespace: { minLeading: 0, maxLeading: 0, minTrailing: 0, maxTrailing: 0 },
      },
    ];
    const result = getReviewFields(columns, 5);
    expect(result).toEqual({
      field_1: { grok_component: 'WORD', example_values: ['value1', 'value2', 'value3'] },
      field_2: { grok_component: 'INT', example_values: ['1', '2', '3'] },
    });
  });
});

describe('getGrokProcessor', () => {
  it('handles review results with multiple columns for a single field', () => {
    const usefulTokens: TokenTuple[] = [
      ['[', undefined],
      ['DAY', 'field_1'],
      [' ', undefined],
      ['SYSLOGTIMESTAMP', 'field_2'],
      [' ', undefined],
      ['INT', 'field_3'],
      [']', undefined],
      [' ', undefined],
      ['[', undefined],
      ['LOGLEVEL', 'field_4'],
      [']', undefined],
      [' ', undefined],
      ['GREEDYDATA', 'field_5'],
    ];
    const reviewFields: ReviewFields = {
      field_1: { grok_component: 'DAY', example_values: ['Tue'] },
      field_2: {
        grok_component: 'SYSLOGTIMESTAMP',
        example_values: ['Aug 12 19:19:16', 'Aug 12 19:19:20', 'Aug 12 19:19:23'],
      },
      field_3: { grok_component: 'INT', example_values: ['2025'] },
      field_4: { grok_component: 'LOGLEVEL', example_values: ['notice', 'error', 'notice'] },
      field_5: {
        grok_component: 'GREEDYDATA',
        example_values: [
          'mod_jk child workerEnv in error state 6',
          'workerEnv.init() ok /etc/httpd/conf/workers2.properties',
        ],
      },
    };
    const reviewResult = {
      log_source: 'Apache HTTP Server Log',
      fields: [
        {
          name: '@timestamp',
          columns: ['field_1', 'field_2', 'field_3'],
          grok_components: ['DAY', 'SYSLOGTIMESTAMP', 'YEAR'],
        },
        {
          name: 'log.level',
          columns: ['field_4'],
          grok_components: ['LOGLEVEL'],
        },
        {
          name: 'message',
          columns: ['field_5'],
          grok_components: ['GREEDYDATA'],
        },
      ],
    };
    const result = getGrokProcessor(usefulTokens, reviewFields, reviewResult);
    expect(result).toEqual({
      description: 'Apache HTTP Server Log',
      pattern_definitions: {
        CUSTOM_TIMESTAMP: '%{DAY} %{SYSLOGTIMESTAMP} %{YEAR}',
      },
      patterns: [
        '\\[%{CUSTOM_TIMESTAMP:@timestamp}\\] \\[%{LOGLEVEL:log.level}\\] %{GREEDYDATA:message}',
      ],
    });
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
