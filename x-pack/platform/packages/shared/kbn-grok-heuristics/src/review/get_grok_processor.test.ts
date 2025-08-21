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

import type { NamedToken } from '../types';
import { getGrokProcessor } from './get_grok_processor';

describe('getGrokProcessor', () => {
  it('handles review results with multiple columns for a single field', () => {
    const tokens: NamedToken[] = [
      {
        id: undefined,
        pattern: '[',
        values: [],
      },
      {
        id: 'field_1',
        pattern: 'DAY',
        values: ['Tue'],
      },
      {
        id: undefined,
        pattern: ' ',
        values: [],
      },
      {
        id: 'field_2',
        pattern: 'SYSLOGTIMESTAMP',
        values: ['Aug 12 19:19:16', 'Aug 12 19:19:20', 'Aug 12 19:19:23'],
      },
      {
        id: undefined,
        pattern: ' ',
        values: [],
      },
      {
        id: 'field_3',
        pattern: 'INT',
        values: ['2025'],
      },
      {
        id: undefined,
        pattern: ']',
        values: [],
      },
      {
        id: undefined,
        pattern: ' ',
        values: [],
      },
      {
        id: undefined,
        pattern: '[',
        values: [],
      },
      {
        id: 'field_4',
        pattern: 'LOGLEVEL',
        values: ['notice', 'error', 'notice'],
      },
      {
        id: undefined,
        pattern: ']',
        values: [],
      },
      {
        id: undefined,
        pattern: ' ',
        values: [],
      },
      {
        id: 'field_5',
        pattern: 'GREEDYDATA',
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

    const result = getGrokProcessor(tokens, reviewResult);
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
