/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { summarizeProcessor } from './processor_summary';

describe('summarizeProcessor', () => {
  it('describes each add_fields field and its condition', () => {
    expect(
      summarizeProcessor({
        type: 'add_fields',
        supported_telemetry: ['logs'],
        config: [
          { name: 'condition', value: 'resource.attributes["env"] == "prod"' },
          {
            name: 'fields',
            value: [
              { action: 'upsert', location: 'attributes', name: 'team', value: 'core' },
              { action: 'insert', location: 'resource', name: 'tier', ottl_value: 'Tier()' },
            ],
          },
        ],
      })
    ).toBe(
      'upsert attributes.team = "core"; insert resource.tier = Tier() if resource.attributes["env"] == "prod"'
    );
  });

  it('describes each set operation', () => {
    expect(
      summarizeProcessor({
        type: 'set',
        supported_telemetry: ['logs'],
        config: [
          {
            name: 'operations',
            value: [
              { action: 'upsert', location: 'attributes', path: 'team', value: 'core' },
              {
                action: 'upsert',
                context: 'log',
                path: 'body',
                ottl_value: 'ToUpperCase(log.body)',
              },
              { action: 'update', path: 'log.attributes["secret"]', value: 'x' },
            ],
          },
        ],
      })
    ).toBe(
      'upsert attributes.team = "core"; upsert log.body = ToUpperCase(log.body); update log.attributes["secret"] = "x"'
    );
  });

  it('falls back to listing parameters for other types', () => {
    expect(
      summarizeProcessor({
        type: 'parse_grok',
        supported_telemetry: ['logs'],
        config: [
          { name: 'field', value: 'message' },
          { name: 'patterns', value: ['%{WORD:service}'] },
        ],
      })
    ).toBe('field: message, patterns: ["%{WORD:service}"]');
  });
});
