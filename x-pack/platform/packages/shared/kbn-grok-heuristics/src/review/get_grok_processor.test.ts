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

import type { GrokPatternNode } from '../types';
import { getGrokProcessor } from './get_grok_processor';

describe('getGrokProcessor', () => {
  it('handles review results with multiple columns for a single field', () => {
    const grokPatternNodes: GrokPatternNode[] = [
      { pattern: '[' },
      {
        id: 'field_1',
        component: 'DAY',
        values: ['Tue'],
      },
      { pattern: ' ' },
      {
        id: 'field_2',
        component: 'SYSLOGTIMESTAMP',
        values: ['Aug 12 19:19:16', 'Aug 12 19:19:20', 'Aug 12 19:19:23'],
      },
      { pattern: ' ' },
      {
        id: 'field_3',
        component: 'INT',
        values: ['2025'],
      },
      { pattern: ']' },
      { pattern: ' ' },
      { pattern: '[' },
      {
        id: 'field_4',
        component: 'LOGLEVEL',
        values: ['notice', 'error', 'notice'],
      },
      { pattern: ']' },
      { pattern: ' ' },
      {
        id: 'field_5',
        component: 'GREEDYDATA',
        values: [
          'mod_jk child workerEnv in error state 6',
          'workerEnv.init() ok /etc/httpd/conf/workers2.properties',
        ],
      },
    ];

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

    const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult);
    expect(grokProcessor).toEqual({
      description: 'Apache HTTP Server Log',
      pattern_definitions: {
        CUSTOM_TIMESTAMP: '%{DAY} %{SYSLOGTIMESTAMP} %{YEAR}',
      },
      patterns: [
        '\\[%{CUSTOM_TIMESTAMP:@timestamp}\\] \\[%{LOGLEVEL:log.level}\\] %{GREEDYDATA:message}',
      ],
    });
  });

  it('collapses multi-column grouping when last component is GREEDYDATA', () => {
    const grokPatternNodes: GrokPatternNode[] = [
      { pattern: '[' },
      {
        id: 'field_1',
        component: 'TIMESTAMP_ISO8601',
        values: ['2025-08-07T09:01:01Z'],
      },
      { pattern: ']' },
      { pattern: ' ' },
      {
        id: 'field_2',
        component: 'NOTSPACE',
        values: ['Error:'],
      },
      { pattern: ' ' },
      {
        id: 'field_3',
        component: 'WORD',
        values: ['Connection'],
      },
      { pattern: ' ' },
      {
        id: 'field_4',
        component: 'DATA',
        values: ['failed'],
      },
      { pattern: ' ' },
      {
        id: 'field_5',
        component: 'GREEDYDATA',
        values: ['at line 42'],
      },
    ];

    // LLM groups field_2 through field_5 into a SINGLE multi-column entry
    // This mimics what the LLM does when it follows the "group adjacent fields" instruction
    const reviewResult = {
      log_source: 'Application Error Log',
      fields: [
        {
          name: '@timestamp',
          columns: ['field_1'],
          grok_components: ['TIMESTAMP_ISO8601'],
        },
        {
          name: 'error.message',
          columns: ['field_2', 'field_3', 'field_4', 'field_5'], // Multi-column grouping
          grok_components: ['NOTSPACE', 'WORD', 'DATA', 'GREEDYDATA'],
        },
      ],
    };

    const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult);
    
    // Should collapse to GREEDYDATA, not create a complex custom pattern
    expect(grokProcessor).toEqual({
      description: 'Application Error Log',
      pattern_definitions: {},
      patterns: ['\\[%{TIMESTAMP_ISO8601:@timestamp}\\] %{GREEDYDATA:error.message}'],
    });
  });
});
