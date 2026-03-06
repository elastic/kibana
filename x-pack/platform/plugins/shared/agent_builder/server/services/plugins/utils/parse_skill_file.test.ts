/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSkillFile } from './parse_skill_file';

describe('parseSkillFile', () => {
  it('parses a skill with all supported frontmatter fields', () => {
    const raw = [
      '---',
      'name: my-skill',
      'description: What this skill does',
      'disable-model-invocation: true',
      'allowed-tools: Read, Grep, Glob',
      '---',
      '',
      'Your skill instructions here...',
    ].join('\n');

    const result = parseSkillFile(raw);

    expect(result.meta).toEqual({
      name: 'my-skill',
      description: 'What this skill does',
      disableModelInvocation: true,
      allowedTools: ['Read', 'Grep', 'Glob'],
    });
    expect(result.content).toBe('Your skill instructions here...');
  });

  it('parses a skill with no frontmatter', () => {
    const raw = 'Just some markdown content\n\nWith multiple paragraphs.';

    const result = parseSkillFile(raw);

    expect(result.meta).toEqual({});
    expect(result.content).toBe('Just some markdown content\n\nWith multiple paragraphs.');
  });

  it('parses a skill with partial frontmatter', () => {
    const raw = ['---', 'name: partial-skill', '---', '', 'Content here.'].join('\n');

    const result = parseSkillFile(raw);

    expect(result.meta).toEqual({ name: 'partial-skill' });
    expect(result.content).toBe('Content here.');
  });

  it('trims allowed-tools values and filters empty strings', () => {
    const raw = ['---', 'allowed-tools:  Read ,  Grep ,  , Glob  ', '---', '', 'Content.'].join(
      '\n'
    );

    const result = parseSkillFile(raw);

    expect(result.meta.allowedTools).toEqual(['Read', 'Grep', 'Glob']);
  });

  it('handles disable-model-invocation set to false', () => {
    const raw = ['---', 'disable-model-invocation: false', '---', '', 'Content.'].join('\n');

    const result = parseSkillFile(raw);

    expect(result.meta.disableModelInvocation).toBe(false);
  });

  it('ignores unknown frontmatter fields', () => {
    const raw = [
      '---',
      'name: my-skill',
      'context: fork',
      'agent: Explore',
      'model: fast',
      '---',
      '',
      'Content.',
    ].join('\n');

    const result = parseSkillFile(raw);

    expect(result.meta).toEqual({ name: 'my-skill' });
    expect(result.content).toBe('Content.');
  });

  it('handles invalid YAML frontmatter gracefully', () => {
    const raw = ['---', '  invalid: [yaml: broken', '---', '', 'Content.'].join('\n');

    const result = parseSkillFile(raw);

    expect(result.meta).toEqual({});
    expect(result.content).toBe('Content.');
  });

  it('handles empty frontmatter', () => {
    const raw = ['---', '---', '', 'Content.'].join('\n');

    const result = parseSkillFile(raw);

    expect(result.meta).toEqual({});
    expect(result.content).toBe('Content.');
  });

  it('trims content whitespace', () => {
    const raw = ['---', 'name: trimmer', '---', '', '  Content with leading space.  ', ''].join(
      '\n'
    );

    const result = parseSkillFile(raw);

    expect(result.content).toBe('Content with leading space.');
  });
});
