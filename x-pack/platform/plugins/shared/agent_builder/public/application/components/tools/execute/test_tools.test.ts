/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFormData } from './test_tools';

describe('parseFormData', () => {
  const mockParameters = [
    { name: 'settings', type: 'object' },
    { name: 'tags', type: 'array' },
    { name: 'description', type: 'string' },
  ];

  it('successfully parses valid JSON strings for object/array types', () => {
    const rawData = {
      settings: '{"color": "blue", "retry": true}',
      tags: '["urgent", "review"]',
      description: 'Standard text',
    };

    const result = parseFormData(rawData, mockParameters);

    expect(result.settings).toEqual({ color: 'blue', retry: true });
    expect(result.tags).toEqual(['urgent', 'review']);
    expect(result.description).toBe('Standard text');
  });

  it('falls back to the raw string if JSON is malformed', () => {
    const rawData = {
      settings: '{"unclosed_brace": true', // Missing '}'
    };

    const result = parseFormData(rawData, mockParameters);

    // Should return the original string instead of throwing an error
    expect(result.settings).toBe('{"unclosed_brace": true');
  });

  it('excludes empty strings and whitespace-only values', () => {
    const rawData = {
      settings: '   ',
      tags: '',
      description: 'valid value',
    };

    const result = parseFormData(rawData, mockParameters);

    expect(result).not.toHaveProperty('settings');
    expect(result).not.toHaveProperty('tags');
    expect(result.description).toBe('valid value');
  });

  it('handles fields that are not present in the parameters list', () => {
    const rawData = {
      unknownField: '{"key": "value"}',
    };

    const result = parseFormData(rawData, mockParameters);

    // It should just pass through unchanged because the type isn't confirmed
    expect(result.unknownField).toBe('{"key": "value"}');
  });

  it('passes through non-string values unchanged', () => {
    const rawData = {
      settings: { alreadyParsed: true },
      tags: ['already', 'an', 'array'],
      description: 123,
    };

    const result = parseFormData(rawData, mockParameters);

    expect(result.settings).toEqual({ alreadyParsed: true });
    expect(result.tags).toEqual(['already', 'an', 'array']);
    expect(result.description).toBe(123);
  });

  it('handles empty form data', () => {
    const result = parseFormData({}, mockParameters);
    expect(result).toEqual({});
  });

  it('handles empty parameters list', () => {
    const rawData = {
      settings: '{"key": "value"}',
      description: 'text',
    };

    const result = parseFormData(rawData, []);

    // Without parameter type info, values pass through as-is
    expect(result.settings).toBe('{"key": "value"}');
    expect(result.description).toBe('text');
  });
});
