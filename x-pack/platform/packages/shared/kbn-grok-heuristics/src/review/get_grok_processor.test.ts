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

  it('collapses repeated field names to avoid duplicate captures', () => {
    const grokPatternNodes: GrokPatternNode[] = [
      {
        id: 'field_1',
        component: 'TIMESTAMP_ISO8601',
        values: ['2025-08-07T09:01:01Z'],
      },
      { pattern: ' ' },
      {
        id: 'field_2',
        component: 'LOGLEVEL',
        values: ['INFO'],
      },
      { pattern: ' ' },
      {
        id: 'field_3',
        component: 'DATA',
        values: ['Logger'],
      },
      { pattern: ' ' },
      {
        id: 'field_4',
        component: 'DATA',
        values: ['Message'],
      },
      { pattern: '\\\\' },
      {
        id: 'field_5',
        component: 'DATA',
        values: ['part1'],
      },
      { pattern: '_' },
      {
        id: 'field_6',
        component: 'DATA',
        values: ['part2'],
      },
      { pattern: '_' },
      {
        id: 'field_7',
        component: 'DATA',
        values: ['part3'],
      },
      { pattern: '_' },
      {
        id: 'field_8',
        component: 'DATA',
        values: ['unknown'],
      },
      { pattern: '_' },
      {
        id: 'field_9',
        component: 'GREEDYDATA',
        values: ['rest'],
      },
    ];

    // LLM returns same field name multiple times
    const reviewResult = {
      log_source: 'Application Log with Repeated Fields',
      fields: [
        {
          name: '@timestamp',
          columns: ['field_1'],
          grok_components: ['TIMESTAMP_ISO8601'],
        },
        {
          name: 'log.level',
          columns: ['field_2'],
          grok_components: ['LOGLEVEL'],
        },
        {
          name: 'log.logger',
          columns: ['field_3'],
          grok_components: ['DATA'],
        },
        {
          name: 'body.text',
          columns: ['field_4'],
          grok_components: ['DATA'],
        },
        {
          name: 'body.text', // Repeated
          columns: ['field_5'],
          grok_components: ['DATA'],
        },
        {
          name: 'body.text', // Repeated
          columns: ['field_6'],
          grok_components: ['DATA'],
        },
        {
          name: 'body.text', // Repeated
          columns: ['field_7'],
          grok_components: ['DATA'],
        },
        {
          name: 'body.text', // Repeated
          columns: ['field_8'],
          grok_components: ['DATA'],
        },
        {
          name: 'body.text', // Repeated
          columns: ['field_9'],
          grok_components: ['GREEDYDATA'],
        },
      ],
    };

    const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult);

    // Should collapse repeated body.text captures into GREEDYDATA (the last one is GREEDYDATA)
    expect(grokProcessor).toEqual({
      description: 'Application Log with Repeated Fields',
      pattern_definitions: {},
      patterns: [
        '%{TIMESTAMP_ISO8601:@timestamp} %{LOGLEVEL:log.level} %{DATA:log.logger} %{GREEDYDATA:body.text}',
      ],
    });
  });

  it('simplifies multi-column tail patterns to GREEDYDATA', () => {
    const grokPatternNodes: GrokPatternNode[] = [
      {
        id: 'field_1',
        component: 'TIMESTAMP_ISO8601',
        values: ['2025-12-19 09:18:49'],
      },
      { pattern: ', ' },
      {
        id: 'field_2',
        component: 'LOGLEVEL',
        values: ['Info'],
      },
      { pattern: ' ' },
      {
        id: 'field_3',
        component: 'WORD',
        values: ['CBS'],
      },
      { pattern: ' ' },
      // Multi-column field at the tail
      {
        id: 'field_4',
        component: 'WORD',
        values: ['Loaded'],
      },
      { pattern: ' ' },
      {
        id: 'field_5',
        component: 'WORD',
        values: ['Servicing'],
      },
      { pattern: ' ' },
      {
        id: 'field_6',
        component: 'WORD',
        values: ['Stack'],
      },
      { pattern: ' ' },
      {
        id: 'field_7',
        component: 'DATA',
        values: ['v6.1.7601.23505'],
      },
    ];

    const reviewResult = {
      log_source: 'Windows CBS Log',
      fields: [
        {
          name: 'attributes.custom.timestamp',
          columns: ['field_1'],
          grok_components: ['TIMESTAMP_ISO8601'],
        },
        {
          name: 'severity_text',
          columns: ['field_2'],
          grok_components: ['LOGLEVEL'],
        },
        {
          name: 'attributes.log.logger',
          columns: ['field_3'],
          grok_components: ['WORD'],
        },
        {
          name: 'body.text',
          columns: ['field_4', 'field_5', 'field_6', 'field_7'],
          grok_components: ['WORD', 'WORD', 'WORD', 'DATA'],
        },
      ],
    };

    const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult);

    // Should simplify multi-column field at the tail to GREEDYDATA
    expect(grokProcessor).toEqual({
      description: 'Windows CBS Log',
      pattern_definitions: {},
      patterns: [
        '%{TIMESTAMP_ISO8601:attributes.custom.timestamp}, %{LOGLEVEL:severity_text} %{WORD:attributes.log.logger} %{GREEDYDATA:body.text}',
      ],
    });
  });
});
