/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  compileAuditIgnoreFilters,
  compileUsersFilter,
  parseUsersFilterEntry,
  validateUsersFilter,
} from './audit_ignore_filters';

describe('parseUsersFilterEntry', () => {
  it('parses a plain string as a literal', () => {
    expect(parseUsersFilterEntry('jdoe')).toEqual({ type: 'literal', value: 'jdoe' });
  });

  it('parses a slash-delimited string as a regex', () => {
    expect(parseUsersFilterEntry('/^svc-.*/')).toEqual({
      type: 'regex',
      pattern: '^svc-.*',
      negated: false,
    });
  });

  it('parses a string prefixed with an exclamation mark as a negated regex', () => {
    expect(parseUsersFilterEntry('!/^svc-.*/')).toEqual({
      type: 'regex',
      pattern: '^svc-.*',
      negated: true,
    });
  });

  it('parses too-short delimiter-only strings as literals', () => {
    expect(parseUsersFilterEntry('/')).toEqual({ type: 'literal', value: '/' });
    expect(parseUsersFilterEntry('!/')).toEqual({ type: 'literal', value: '!/' });
  });

  it('parses empty patterns as regexes', () => {
    expect(parseUsersFilterEntry('//')).toEqual({ type: 'regex', pattern: '', negated: false });
    expect(parseUsersFilterEntry('!//')).toEqual({ type: 'regex', pattern: '', negated: true });
  });

  it('parses a username wrapped in slashes as a regex, not a literal', () => {
    expect(parseUsersFilterEntry('/jdoe/')).toEqual({
      type: 'regex',
      pattern: 'jdoe',
      negated: false,
    });
  });
});

describe('compileUsersFilter', () => {
  it('matches literals exactly', () => {
    const matcher = compileUsersFilter(['jdoe', 'jsmith']);
    expect(matcher('jdoe')).toBe(true);
    expect(matcher('jsmith')).toBe(true);
    expect(matcher('jd')).toBe(false);
    expect(matcher('JDOE')).toBe(false);
  });

  it('matches regex entries', () => {
    const matcher = compileUsersFilter(['/^[0-9]+$/']);
    expect(matcher('123')).toBe(true);
    expect(matcher('abc')).toBe(false);
    expect(matcher('123abc')).toBe(false);
  });

  it('matches regex entries anywhere in the username unless anchored', () => {
    const matcher = compileUsersFilter(['/dmi/']);
    expect(matcher('admin')).toBe(true);
    expect(matcher('jdoe')).toBe(false);
  });

  it('matches negated regex entries when the pattern does not match', () => {
    const matcher = compileUsersFilter(['!/^svc-.*/']);
    expect(matcher('jdoe')).toBe(true);
    expect(matcher('svc-deploy')).toBe(false);
  });

  it('matches when any literal, regex, or negated regex entry matches', () => {
    const matcher = compileUsersFilter(['jdoe', '/^svc-/', '!/^[a-z]/']);
    expect(matcher('jdoe')).toBe(true);
    expect(matcher('svc-deploy')).toBe(true);
    expect(matcher('Admin')).toBe(true);
    expect(matcher('jsmith')).toBe(false);
  });

  it('throws when a regex entry contains an invalid pattern', () => {
    expect(() => compileUsersFilter(['/(/'])).toThrowErrorMatchingInlineSnapshot(
      `"error parsing regexp: missing closing ): \`(\`"`
    );
  });
});

describe('validateUsersFilter', () => {
  it('returns undefined for literals and valid regex entries', () => {
    expect(validateUsersFilter(['jdoe', '/^svc-.*/', '!/^[0-9]+$/'])).toBeUndefined();
  });

  it('returns an error naming the array position of an invalid regex entry', () => {
    expect(validateUsersFilter(['jdoe', '/(/'])).toMatchInlineSnapshot(
      `"\\"error parsing regexp: missing closing ): \`(\`\\" at array position 1"`
    );
  });

  it('joins errors when multiple entries are invalid', () => {
    const errors = validateUsersFilter(['/(/', '/[/']);
    expect(errors).toContain('at array position 0');
    expect(errors).toContain('at array position 1');
    expect(errors).toContain('. ');
  });

  it('rejects patterns using unsupported syntax such as lookahead', () => {
    expect(validateUsersFilter(['/foo(?=bar)/'])).toContain('invalid or unsupported Perl syntax');
  });
});

describe('compileAuditIgnoreFilters', () => {
  it('returns undefined when no filters are configured', () => {
    expect(compileAuditIgnoreFilters(undefined)).toBeUndefined();
  });

  it('compiles users entries into a matcher and leaves other fields untouched', () => {
    const compiled = compileAuditIgnoreFilters([
      { actions: ['http_request'], users: ['jdoe', '/^svc-/'] },
      { spaces: ['default'] },
    ]);

    expect(compiled).toHaveLength(2);
    expect(compiled![0].actions).toEqual(['http_request']);
    expect(compiled![0].users!('jdoe')).toBe(true);
    expect(compiled![0].users!('svc-deploy')).toBe(true);
    expect(compiled![0].users!('jsmith')).toBe(false);
    expect(compiled![1]).toEqual({ spaces: ['default'] });
  });
});
