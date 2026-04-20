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
  maxToolsPerSkill,
  maxReferencedContentItems,
} from './validation';

describe('validateSkillId', () => {
  it('should return undefined for a valid skill ID', () => {
    expect(validateSkillId('valid-skill-id')).toBeUndefined();
    expect(validateSkillId('skill1')).toBeUndefined();
    expect(validateSkillId('my-skill-123')).toBeUndefined();
    expect(validateSkillId('a')).toBeUndefined();
  });

  it('should accept IDs with only numbers', () => {
    expect(validateSkillId('123')).toBeUndefined();
  });

  it('should accept IDs with underscores in the middle', () => {
    expect(validateSkillId('my_skill_id')).toBeUndefined();
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

  it('should return an error for IDs with dots', () => {
    expect(validateSkillId('.invalid')).toBeDefined();
    expect(validateSkillId('invalid.')).toBeDefined();
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
    name: 'My Skill Name',
    description: 'A test skill',
    content: 'Skill instructions',
    tool_ids: ['tool-a'],
  };

  it('should accept a valid create request', () => {
    expect(() => skillCreateRequestSchema.parse(validRequest)).not.toThrow();
  });

  it('should accept a name with spaces and mixed case', () => {
    expect(() =>
      skillCreateRequestSchema.parse({ ...validRequest, name: 'My Data Exploration Skill' })
    ).not.toThrow();
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

  it('should reject tool_ids containing empty strings', () => {
    expect(() => skillCreateRequestSchema.parse({ ...validRequest, tool_ids: [''] })).toThrow();
  });

  it('should reject tool_ids exceeding max tools per skill', () => {
    const tooManyTools = Array.from({ length: maxToolsPerSkill + 1 }, (_, i) => `tool-${i}`);
    expect(() =>
      skillCreateRequestSchema.parse({ ...validRequest, tool_ids: tooManyTools })
    ).toThrow();
  });

  it('should accept tool_ids at max tools per skill', () => {
    const maxTools = Array.from({ length: maxToolsPerSkill }, (_, i) => `tool-${i}`);
    expect(() =>
      skillCreateRequestSchema.parse({ ...validRequest, tool_ids: maxTools })
    ).not.toThrow();
  });

  it('should accept optional referenced_content', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [{ name: 'ref-1', relativePath: './', content: 'Some content' }],
      })
    ).not.toThrow();
  });

  it('should accept referenced_content with spaced file names and nested paths', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [
          { name: 'My Notes', relativePath: './templates/extras', content: 'hello' },
        ],
      })
    ).not.toThrow();
  });

  it('should accept referenced_content with empty file content', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [{ name: 'empty-body', relativePath: './', content: '' }],
      })
    ).not.toThrow();
  });

  it('should reject referenced_content with invalid name', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [{ name: '/bad', relativePath: './', content: 'Some content' }],
      })
    ).toThrow();
  });

  it('should reject referenced_content with relativePath not starting with ./', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [
          { name: 'valid-name', relativePath: '/absolute/path', content: 'Some content' },
        ],
      })
    ).toThrow();
  });

  it('should reject referenced_content with path traversal', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [{ name: 'x', relativePath: './foo/../bar', content: 'Some content' }],
      })
    ).toThrow();
  });

  it('should reject duplicate referenced paths after normalization', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [
          { name: 'dup', relativePath: './templates', content: 'a' },
          { name: 'dup', relativePath: './templates/', content: 'b' },
        ],
      })
    ).toThrow();
  });

  it('should reject reserved SKILL file at skill root', () => {
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: [{ name: 'Skill', relativePath: './', content: 'x' }],
      })
    ).toThrow();
  });

  it('should reject more than maxReferencedContentItems referenced files', () => {
    const referencedContent = Array.from({ length: maxReferencedContentItems + 1 }, (_, i) => ({
      name: `f${i}`,
      relativePath: './',
      content: 'x',
    }));
    expect(() =>
      skillCreateRequestSchema.parse({
        ...validRequest,
        referenced_content: referencedContent,
      })
    ).toThrow();
  });
});

describe('skillUpdateRequestSchema', () => {
  it('should accept a partial update', () => {
    expect(() => skillUpdateRequestSchema.parse({ name: 'Updated Name' })).not.toThrow();
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

  it('should reject tool_ids exceeding max tools per skill', () => {
    const tooManyTools = Array.from({ length: maxToolsPerSkill + 1 }, (_, i) => `tool-${i}`);
    expect(() => skillUpdateRequestSchema.parse({ tool_ids: tooManyTools })).toThrow();
  });

  it('should reject referenced_content with invalid path protocol', () => {
    expect(() =>
      skillUpdateRequestSchema.parse({
        referenced_content: [{ name: 'ok', relativePath: '.', content: 'test' }],
      })
    ).toThrow();
  });

  it('should accept valid referenced_content on update', () => {
    expect(() =>
      skillUpdateRequestSchema.parse({
        referenced_content: [{ name: 'Extra', relativePath: './docs', content: '' }],
      })
    ).not.toThrow();
  });
});
