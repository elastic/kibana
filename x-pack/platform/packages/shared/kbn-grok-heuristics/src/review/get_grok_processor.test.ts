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

  it('collapses sequential fields with the same LLM-assigned name into GREEDYDATA', () => {
    const grokPatternNodes: GrokPatternNode[] = [
      {
        id: 'field_1',
        component: 'TIMESTAMP_ISO8601',
        values: ['2025-01-15T10:30:45Z'],
      },
      { pattern: ' ' },
      {
        id: 'field_2',
        component: 'LOGLEVEL',
        values: ['ERROR'],
      },
      { pattern: ' ' },
      {
        id: 'field_3',
        component: 'NOTSPACE',
        values: ['Failed', 'Connection'],
      },
      { pattern: ' ' },
      {
        id: 'field_4',
        component: 'DATA',
        values: ['to', 'timeout'],
      },
      { pattern: ' ' },
      {
        id: 'field_5',
        component: 'WORD',
        values: ['database', 'reached'],
      },
    ];

    // LLM names field_3, field_4, and field_5 all as "error.message"
    const reviewResult = {
      log_source: 'Application Error Log',
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
          name: 'error.message',
          columns: ['field_3'],
          grok_components: ['NOTSPACE'],
        },
        {
          name: 'error.message',
          columns: ['field_4'],
          grok_components: ['DATA'],
        },
        {
          name: 'error.message',
          columns: ['field_5'],
          grok_components: ['WORD'],
        },
      ],
    };

    const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult);
    
    // The three sequential "error.message" fields should be collapsed into one GREEDYDATA
    expect(grokProcessor).toEqual({
      description: 'Application Error Log',
      pattern_definitions: {},
      patterns: [
        '%{TIMESTAMP_ISO8601:@timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:error.message}',
      ],
    });
  });

  it('aggressively collapses many sequential fields with the same name (real-world scenario)', () => {
    const grokPatternNodes: GrokPatternNode[] = [
      { pattern: '[' },
      {
        id: 'field_1',
        component: 'TIMESTAMP_ISO8601',
        values: ['2025-08-07T09:01:01Z'],
      },
      { pattern: ']' },
      { pattern: ' ' },
      { pattern: '[' },
      {
        id: 'field_2',
        component: 'LOGLEVEL',
        values: ['ERROR'],
      },
      { pattern: ']' },
      { pattern: ' ' },
      {
        id: 'field_3',
        component: 'NOTSPACE',
        values: ['Traceback', 'TypeError'],
      },
      { pattern: ' ' },
      {
        id: 'field_4',
        component: 'NOTSPACE',
        values: ['(most', 'Cannot'],
      },
      { pattern: ' ' },
      {
        id: 'field_5',
        component: 'WORD',
        values: ['recent', 'read'],
      },
      { pattern: ' ' },
      {
        id: 'field_6',
        component: 'WORD',
        values: ['call', 'properties'],
      },
      { pattern: ' ' },
      {
        id: 'field_7',
        component: 'NOTSPACE',
        values: ['last):', 'of'],
      },
      { pattern: ' ' },
      {
        id: 'field_8',
        component: 'DATA',
        values: ['File', 'undefined'],
      },
      { pattern: ' ' },
      {
        id: 'field_9',
        component: 'NOTSPACE',
        values: ['"/app/processor.py",', '(reading'],
      },
      { pattern: ' ' },
      {
        id: 'field_10',
        component: 'DATA',
        values: ['line', "\'name\')"],
      },
      { pattern: ' ' },
      {
        id: 'field_11',
        component: 'GREEDYDATA',
        values: ['112, in process_record...', 'at getUserName...'],
      },
    ];

    // LLM names field_3 through field_11 all as "attributes.exception.message"
    const reviewResult = {
      log_source: 'Application Error Log with Stack Trace',
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
          name: 'attributes.exception.message',
          columns: ['field_3'],
          grok_components: ['NOTSPACE'],
        },
        {
          name: 'attributes.exception.message',
          columns: ['field_4'],
          grok_components: ['NOTSPACE'],
        },
        {
          name: 'attributes.exception.message',
          columns: ['field_5'],
          grok_components: ['WORD'],
        },
        {
          name: 'attributes.exception.message',
          columns: ['field_6'],
          grok_components: ['WORD'],
        },
        {
          name: 'attributes.exception.message',
          columns: ['field_7'],
          grok_components: ['NOTSPACE'],
        },
        {
          name: 'attributes.exception.message',
          columns: ['field_8'],
          grok_components: ['DATA'],
        },
        {
          name: 'attributes.exception.message',
          columns: ['field_9'],
          grok_components: ['NOTSPACE'],
        },
        {
          name: 'attributes.exception.message',
          columns: ['field_10'],
          grok_components: ['DATA'],
        },
        {
          name: 'attributes.exception.message',
          columns: ['field_11'],
          grok_components: ['GREEDYDATA'],
        },
      ],
    };

    const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult);
    
    // All the sequential "attributes.exception.message" fields should collapse into GREEDYDATA
    // NOT into a complex custom pattern definition
    expect(grokProcessor).toEqual({
      description: 'Application Error Log with Stack Trace',
      pattern_definitions: {},
      patterns: [
        '\\[%{TIMESTAMP_ISO8601:attributes.custom.timestamp}\\] \\[%{LOGLEVEL:severity_text}\\] %{GREEDYDATA:attributes.exception.message}',
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
