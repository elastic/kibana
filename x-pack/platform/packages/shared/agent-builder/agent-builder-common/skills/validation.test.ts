/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateSkillId,
  skillCreateRequestSchema,
  skillUpdateRequestSchema,
  skillIdMaxLength,
} from './validation';

describe('validateSkillId', () => {
  it('should return undefined for a valid skill ID', () => {
    expect(validateSkillId('valid-skill-id')).toBeUndefined();
    expect(validateSkillId('skill1')).toBeUndefined();
    expect(validateSkillId('my-skill-123')).toBeUndefined();
    expect(validateSkillId('a')).toBeUndefined();
  });

  it('should return an error for IDs starting with special characters', () => {
    expect(validateSkillId('-invalid')).toBeDefined();
    expect(validateSkillId('_invalid')).toBeDefined();
  });

  it('should return an error for IDs ending with special characters', () => {
    expect(validateSkillId('invalid-')).toBeDefined();
    expect(validateSkillId('invalid_')).toBeDefined();
  });

  it('should return an error for IDs with uppercase letters', () => {
    expect(validateSkillId('InvalidId')).toBeDefined();
  });

  it('should return an error for empty string', () => {
    expect(validateSkillId('')).toBeDefined();
  });

  it('should return an error for IDs exceeding max length', () => {
    const longId = 'a'.repeat(skillIdMaxLength + 1);
    expect(validateSkillId(longId)).toBeDefined();
  });

  it('should accept IDs at max length', () => {
    const exactId = 'a'.repeat(skillIdMaxLength);
    expect(validateSkillId(exactId)).toBeUndefined();
  });
});

describe('skillCreateRequestSchema', () => {
  const validRequest = {
    id: 'my-skill',
    name: 'my-skill',
    description: 'A test skill',
    content: 'Skill instructions',
    tool_ids: ['tool-a'],
  };

  it('should accept a valid create request', () => {
    expect(() => skillCreateRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('should reject when id is empty', () => {
    expect(() => skillCreateRequestSchema.parse({ ...validRequest, id: '' })).toThrow();
  });

  it('should reject when name is empty', () => {
    expect(() => skillCreateRequestSchema.parse({ ...validRequest, name: '' })).toThrow();
  });

  it('should reject when description is empty', () => {
    expect(() => skillCreateRequestSchema.parse({ ...validRequest, description: '' })).toThrow();
  });

  it('should reject when content is empty', () => {
    expect(() => skillCreateRequestSchema.parse({ ...validRequest, content: '' })).toThrow();
  });

  it('should accept empty tool_ids array', () => {
    expect(() => skillCreateRequestSchema.parse({ ...validRequest, tool_ids: [] })).not.toThrow();
  });

  it('should accept optional referenced_content', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [{ name: 'ref-1', relativePath: '.', content: 'Some content' }],
      })
    ).not.toThrow();
  });
});

describe('skillUpdateRequestSchema', () => {
  it('should accept a partial update', () => {
    expect(() => skillUpdateRequestSchema.parse({ name: 'updated-name' })).not.toThrow();
  });

  it('should accept an empty object', () => {
    expect(() => skillUpdateRequestSchema.parse({})).not.toThrow();
  });

  it('should reject when name is empty', () => {
    expect(() => skillUpdateRequestSchema.parse({ name: '' })).toThrow();
  });

  it('should accept updating only tool_ids', () => {
    expect(() => skillUpdateRequestSchema.parse({ tool_ids: ['tool-a', 'tool-b'] })).not.toThrow();
  });
});
