/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitFrontmatter } from './split_frontmatter';

describe('splitFrontmatter', () => {
  it('parses frontmatter and body', () => {
    const raw = ['---', 'name: my-skill', 'description: does things', '---', '', 'Body text.'].join(
      '\n'
    );

    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toEqual({ name: 'my-skill', description: 'does things' });
    expect(body).toBe('Body text.');
  });

  it('trims the body', () => {
    const raw = ['---', 'name: my-skill', '---', '', '', '  Body text.  ', ''].join('\n');

    const { body } = splitFrontmatter(raw);

    expect(body).toBe('Body text.');
  });

  it('supports CRLF line endings', () => {
    const raw = ['---', 'name: my-skill', '---', '', 'Body text.'].join('\r\n');

    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toEqual({ name: 'my-skill' });
    expect(body).toBe('Body text.');
  });

  const nullFrontmatterCases: Array<{ label: string; raw: string; expectedBody: string }> = [
    {
      label: 'no block is present',
      raw: 'Just a body with no frontmatter.',
      expectedBody: 'Just a body with no frontmatter.',
    },
    {
      label: 'the block is invalid YAML',
      raw: ['---', 'name: : : broken', '  bad indent', '---', 'Body.'].join('\n'),
      expectedBody: 'Body.',
    },
    {
      label: 'the block is not an object',
      raw: ['---', '- just', '- a', '- list', '---', 'Body.'].join('\n'),
      expectedBody: 'Body.',
    },
  ];

  it.each(nullFrontmatterCases)('returns null frontmatter when $label', ({ raw, expectedBody }) => {
    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toBeNull();
    expect(body).toBe(expectedBody);
  });

  it('returns an empty object for an empty block', () => {
    const raw = ['---', '---', '', 'Body.'].join('\n');

    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toEqual({});
    expect(body).toBe('Body.');
  });

  it('returns an empty body when the document is only frontmatter', () => {
    const raw = ['---', 'name: my-skill', '---'].join('\n');

    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toEqual({ name: 'my-skill' });
    expect(body).toBe('');
  });

  it('does not treat a "---" inside a value as the closing delimiter', () => {
    const raw = ['---', 'description: a --- b', '---', '', 'Body.'].join('\n');

    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toEqual({ description: 'a --- b' });
    expect(body).toBe('Body.');
  });
});
