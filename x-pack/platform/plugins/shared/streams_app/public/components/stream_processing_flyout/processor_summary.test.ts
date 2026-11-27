/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeProcessor, summarizeProcessor } from './processor_summary';

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

  it('describes each rename within its location', () => {
    expect(
      summarizeProcessor({
        type: 'rename_fields',
        supported_telemetry: ['logs'],
        config: [
          { name: 'condition', value: 'IsMatch(body, "error")' },
          {
            name: 'fields',
            value: [
              { location: 'attributes', name: 'svc', new_name: 'service.name' },
              { location: 'resource', name: 'host', new_name: 'host.name' },
            ],
          },
        ],
      })
    ).toBe(
      'rename attributes.svc → attributes.service.name; rename resource.host → resource.host.name if IsMatch(body, "error")'
    );
  });

  it('describes each move from one location to another', () => {
    expect(
      summarizeProcessor({
        type: 'move_fields',
        supported_telemetry: ['logs'],
        config: [
          {
            name: 'fields',
            value: [
              {
                location: 'attributes',
                name: 'host',
                new_location: 'resource',
                new_name: 'host.name',
              },
            ],
          },
        ],
      })
    ).toBe('move attributes.host → resource.host.name');
  });

  it('lists the fields a delete removes from each location', () => {
    expect(
      summarizeProcessor({
        type: 'delete_fields',
        supported_telemetry: ['logs'],
        config: [
          {
            name: 'fields',
            value: [
              { location: 'attributes', names: ['password', 'token'] },
              { location: 'resource', names: ['secret'] },
            ],
          },
        ],
      })
    ).toBe('delete attributes.password, attributes.token; delete resource.secret');
  });

  it('describes what each filter block drops', () => {
    expect(
      summarizeProcessor({
        type: 'filter',
        supported_telemetry: ['logs'],
        config: [
          { name: 'error_mode', value: 'ignore' },
          {
            name: 'conditions',
            value: [
              {
                context: 'log',
                conditions: ['attributes["env"] == "dev"', 'severity_number < 9'],
              },
              { conditions: ['IsMatch(body, "healthz")'] },
            ],
          },
        ],
      })
    ).toBe(
      'drop if attributes["env"] == "dev" or severity_number < 9; drop if IsMatch(body, "healthz")'
    );
  });

  it('lists the statements of each transform block with the conditions that guard them', () => {
    expect(
      summarizeProcessor({
        type: 'transform',
        supported_telemetry: ['logs'],
        config: [
          {
            name: 'statements',
            value: [
              {
                conditions: ['attributes["env"] == "dev"'],
                statements: ['set(attributes["a"], 1)', 'delete_key(attributes, "b")'],
                shared_cache: false,
              },
              { statements: ['set(body, "x")'], shared_cache: false },
            ],
          },
        ],
      })
    ).toBe(
      'set(attributes["a"], 1); delete_key(attributes, "b") if attributes["env"] == "dev"; set(body, "x")'
    );
  });

  it('falls back to listing parameters when a list has nothing to describe yet', () => {
    expect(
      summarizeProcessor({
        type: 'filter',
        supported_telemetry: ['logs'],
        config: [{ name: 'conditions', value: [{ context: 'log' }] }],
      })
    ).toBe('conditions: [{"context":"log"}]');
  });

  it('keeps a summary to one line of the card and the whole text for its tooltip', () => {
    const processor = {
      type: 'delete_fields',
      supported_telemetry: ['logs' as const],
      config: [
        {
          name: 'fields',
          value: [
            {
              location: 'attributes',
              names: Array.from({ length: 40 }, (_, index) => `field_${index}`),
            },
          ],
        },
      ],
    };
    const summary = summarizeProcessor(processor);

    expect(summary).toHaveLength(160);
    expect(summary.endsWith('…')).toBe(true);
    expect(describeProcessor(processor).endsWith('attributes.field_39')).toBe(true);
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
