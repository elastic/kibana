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

  it('ignores a leading byte order mark', () => {
    const raw = `\uFEFF${['---', 'name: my-skill', '---', '', 'Body text.'].join('\n')}`;

    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toEqual({ name: 'my-skill' });
    expect(body).toBe('Body text.');
  });

  it('strips a leading byte order mark from a body with no frontmatter', () => {
    const { body } = splitFrontmatter('\uFEFFJust a body.');

    expect(body).toBe('Just a body.');
  });

  const nullFrontmatterCases: Array<{
    label: string;
    raw: string;
    expectedBody: string;
    expectedError: RegExp | undefined;
  }> = [
    {
      label: 'no block is present',
      raw: 'Just a body with no frontmatter.',
      expectedBody: 'Just a body with no frontmatter.',
      expectedError: undefined,
    },
    {
      label: 'the block is invalid YAML',
      raw: ['---', 'name: : : broken', '  bad indent', '---', 'Body.'].join('\n'),
      expectedBody: 'Body.',
      expectedError: /Nested mappings are not allowed .* at line 1, column 7/,
    },
    {
      label: 'the block is not an object',
      raw: ['---', '- just', '- a', '- list', '---', 'Body.'].join('\n'),
      expectedBody: 'Body.',
      expectedError: /must be a mapping of keys to values/,
    },
  ];

  it.each(nullFrontmatterCases)(
    'returns null frontmatter when $label',
    ({ raw, expectedBody, expectedError }) => {
      const { frontmatter, body, error } = splitFrontmatter(raw);

      expect(frontmatter).toBeNull();
      expect(body).toBe(expectedBody);
      if (expectedError) {
        expect(error).toMatch(expectedError);
      } else {
        expect(error).toBeUndefined();
      }
    }
  );

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

  it.each([
    { label: 'in the middle of a value', value: 'a --- b' },
    { label: 'at the end of a value', value: 'abcdef ---' },
  ])('does not treat a "---" $label as the closing delimiter', ({ value }) => {
    const raw = ['---', `description: ${value}`, '---', '', 'Body.'].join('\n');

    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toEqual({ description: value });
    expect(body).toBe('Body.');
  });

  it('keeps a "---" line in the body out of the frontmatter', () => {
    const raw = ['---', 'name: my-skill', '---', '', 'Body.', '', '---', '', 'More.'].join('\n');

    const { frontmatter, body } = splitFrontmatter(raw);

    expect(frontmatter).toEqual({ name: 'my-skill' });
    expect(body).toBe(['Body.', '', '---', '', 'More.'].join('\n'));
  });
});
