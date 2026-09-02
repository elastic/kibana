/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import {
  serializeMetadataValue,
  deserializeMetadataValue,
  deserializeMetadata,
  buildMetadataFromTemplate,
  withDeserializedMetadata,
} from './serialize';

describe('serializeMetadataValue', () => {
  it('converts boolean true to the string "true"', () => {
    expect(serializeMetadataValue(true, 'TOGGLE')).toBe('true');
  });

  it('converts boolean false to the string "false"', () => {
    expect(serializeMetadataValue(false, 'TOGGLE')).toBe('false');
  });

  it('converts a number to its string representation', () => {
    expect(serializeMetadataValue(42, 'NUMBER')).toBe('42');
    expect(serializeMetadataValue(7.5, 'NUMBER')).toBe('7.5');
    expect(serializeMetadataValue(0, 'NUMBER')).toBe('0');
  });

  it('returns a string as-is for TEXT fields', () => {
    expect(serializeMetadataValue('hello', 'TEXT')).toBe('hello');
  });

  it('returns a string as-is for SELECT fields', () => {
    expect(serializeMetadataValue('option_a', 'SELECT')).toBe('option_a');
  });

  it('converts TEXT_ARRAY values to a string array', () => {
    expect(serializeMetadataValue(['a', 'b'], 'TEXT_ARRAY')).toEqual(['a', 'b']);
  });

  it('wraps a scalar in an array for TEXT_ARRAY', () => {
    expect(serializeMetadataValue('only', 'TEXT_ARRAY')).toEqual(['only']);
  });

  it('round-trips: serialize then deserialize recovers the original value (TOGGLE)', () => {
    const original = true;
    const stored = serializeMetadataValue(original, 'TOGGLE');
    expect(deserializeMetadataValue(stored as string, 'TOGGLE')).toBe(original);
  });

  it('round-trips: serialize then deserialize recovers the original value (NUMBER)', () => {
    const original = 3.14;
    const stored = serializeMetadataValue(original, 'NUMBER');
    expect(deserializeMetadataValue(stored as string, 'NUMBER')).toBe(original);
  });

  it('round-trips: serialize then deserialize recovers the original value (TEXT_ARRAY)', () => {
    const original = ['x', 'y', 'z'];
    const stored = serializeMetadataValue(original, 'TEXT_ARRAY');
    expect(deserializeMetadataValue(stored as string[], 'TEXT_ARRAY')).toEqual(original);
  });
});

describe('deserializeMetadataValue', () => {
  describe('TOGGLE', () => {
    it('returns true when stored value is "true"', () => {
      expect(deserializeMetadataValue('true', 'TOGGLE')).toBe(true);
    });

    it('returns false when stored value is "false"', () => {
      expect(deserializeMetadataValue('false', 'TOGGLE')).toBe(false);
    });

    it('returns false for any other string (not just "false")', () => {
      expect(deserializeMetadataValue('yes', 'TOGGLE')).toBe(false);
      expect(deserializeMetadataValue('', 'TOGGLE')).toBe(false);
    });
  });

  describe('NUMBER', () => {
    it('converts a numeric string to a number', () => {
      expect(deserializeMetadataValue('42', 'NUMBER')).toBe(42);
      expect(deserializeMetadataValue('3.14', 'NUMBER')).toBe(3.14);
      expect(deserializeMetadataValue('0', 'NUMBER')).toBe(0);
      expect(deserializeMetadataValue('-7', 'NUMBER')).toBe(-7);
    });

    it('falls back to the raw string when the value is not a valid number', () => {
      expect(deserializeMetadataValue('not-a-number', 'NUMBER')).toBe('not-a-number');
    });

    it('converts an empty string to 0 (Number("") === 0 per JS spec)', () => {
      expect(deserializeMetadataValue('', 'NUMBER')).toBe(0);
    });
  });

  describe('TEXT_ARRAY', () => {
    it('returns the array as-is when already an array', () => {
      expect(deserializeMetadataValue(['a', 'b'], 'TEXT_ARRAY')).toEqual(['a', 'b']);
    });

    it('wraps a scalar string in an array', () => {
      expect(deserializeMetadataValue('single', 'TEXT_ARRAY')).toEqual(['single']);
    });
  });

  describe('string pass-through types', () => {
    it('returns the value unchanged for TEXT', () => {
      expect(deserializeMetadataValue('hello', 'TEXT')).toBe('hello');
    });

    it('returns the value unchanged for SELECT', () => {
      expect(deserializeMetadataValue('opt_a', 'SELECT')).toBe('opt_a');
    });

    it('returns the value unchanged for DATE', () => {
      expect(deserializeMetadataValue('2024-01-15T00:00:00Z', 'DATE')).toBe('2024-01-15T00:00:00Z');
    });

    it('returns the value unchanged for USER', () => {
      expect(deserializeMetadataValue('user@example.com', 'USER')).toBe('user@example.com');
    });
  });
});

describe('deserializeMetadata', () => {
  const makeTemplate = (
    fields: Record<string, { input_type: ConversationTemplate['fields'][string]['input_type'] }>
  ): ConversationTemplate => ({
    id: 'test-template',
    name: 'Test',
    version: 1,
    fields: Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, { ...v, description: '' }])
    ),
  });

  it('deserializes TOGGLE fields to booleans', () => {
    const template = makeTemplate({ is_urgent: { input_type: 'TOGGLE' } });
    const result = deserializeMetadata({ is_urgent: 'true' }, template);
    expect(result.is_urgent).toBe(true);
  });

  it('deserializes NUMBER fields to numbers', () => {
    const template = makeTemplate({ priority: { input_type: 'NUMBER' } });
    const result = deserializeMetadata({ priority: '7' }, template);
    expect(result.priority).toBe(7);
  });

  it('deserializes TEXT_ARRAY fields to arrays', () => {
    const template = makeTemplate({ tags: { input_type: 'TEXT_ARRAY' } });
    const result = deserializeMetadata({ tags: ['alpha', 'beta'] }, template);
    expect(result.tags).toEqual(['alpha', 'beta']);
  });

  it('passes through TEXT fields unchanged', () => {
    const template = makeTemplate({ description: { input_type: 'TEXT' } });
    const result = deserializeMetadata({ description: 'some text' }, template);
    expect(result.description).toBe('some text');
  });

  it('passes through keys not declared in the template (old shapes rule)', () => {
    const template = makeTemplate({ known_key: { input_type: 'TEXT' } });
    const result = deserializeMetadata({ known_key: 'val', legacy_key: 'still here' }, template);
    expect(result.known_key).toBe('val');
    expect(result.legacy_key).toBe('still here');
  });

  it('handles a mixed bag of field types correctly', () => {
    const template = makeTemplate({
      title: { input_type: 'TEXT' },
      severity: { input_type: 'NUMBER' },
      resolved: { input_type: 'TOGGLE' },
      labels: { input_type: 'TEXT_ARRAY' },
    });
    const result = deserializeMetadata(
      { title: 'Issue', severity: '3', resolved: 'false', labels: ['bug', 'p1'] },
      template
    );
    expect(result.title).toBe('Issue');
    expect(result.severity).toBe(3);
    expect(result.resolved).toBe(false);
    expect(result.labels).toEqual(['bug', 'p1']);
  });

  it('returns an empty object for empty input', () => {
    const template = makeTemplate({ foo: { input_type: 'TEXT' } });
    expect(deserializeMetadata({}, template)).toEqual({});
  });
});

describe('buildMetadataFromTemplate', () => {
  it('serializes template default values and skips fields without defaults', () => {
    const template: ConversationTemplate = {
      id: 'test-template',
      name: 'Test',
      version: 1,
      fields: {
        is_urgent: { input_type: 'TOGGLE', default_value: true },
        priority: { input_type: 'NUMBER', default_value: 3 },
        tags: { input_type: 'TEXT_ARRAY', default_value: ['alpha', 'beta'] },
        omitted: { input_type: 'TEXT' },
      },
    };

    expect(buildMetadataFromTemplate(template)).toEqual({
      is_urgent: 'true',
      priority: '3',
      tags: ['alpha', 'beta'],
    });
  });
});

describe('withDeserializedMetadata', () => {
  const template: ConversationTemplate = {
    id: 'test-template',
    name: 'Test',
    version: 1,
    fields: {
      is_urgent: { input_type: 'TOGGLE' },
      priority: { input_type: 'NUMBER' },
    },
  };

  it('resolves the template through the injected resolver', () => {
    const resolveTemplate = jest.fn().mockReturnValue(template);

    const result = withDeserializedMetadata(
      {
        id: 'conversation-1',
        template_id: 'test-template',
        metadata: { is_urgent: 'true', priority: '2' },
      },
      resolveTemplate
    );

    expect(resolveTemplate).toHaveBeenCalledWith('test-template');
    expect(result.metadata).toEqual({ is_urgent: true, priority: 2 });
  });

  it('returns the original conversation when the template cannot be resolved', () => {
    const conversation = {
      id: 'conversation-1',
      template_id: 'missing-template',
      metadata: { is_urgent: 'true' },
    };

    expect(withDeserializedMetadata(conversation, () => undefined)).toBe(conversation);
  });

  it('does not call the resolver when template_id or metadata are missing', () => {
    const resolveTemplate = jest.fn();
    const conversation = { id: 'conversation-1' };

    expect(withDeserializedMetadata(conversation, resolveTemplate)).toEqual(conversation);
    expect(resolveTemplate).not.toHaveBeenCalled();
  });
});
