/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertAllowedSecurityLabsRepo, parseRepoSlug } from './fetch_content';

describe('parseRepoSlug', () => {
  it('parses an https GitHub URL', () => {
    expect(parseRepoSlug('https://github.com/elastic/security-labs-elastic-co')).toEqual({
      owner: 'elastic',
      repo: 'security-labs-elastic-co',
    });
  });

  it('parses an https GitHub URL with a trailing slash and .git suffix', () => {
    expect(parseRepoSlug('https://github.com/elastic/security-labs-elastic-co.git/')).toEqual({
      owner: 'elastic',
      repo: 'security-labs-elastic-co',
    });
  });

  it('parses a bare owner/repo slug', () => {
    expect(parseRepoSlug('elastic/security-labs-elastic-co')).toEqual({
      owner: 'elastic',
      repo: 'security-labs-elastic-co',
    });
  });

  it('throws when the slug cannot be derived', () => {
    expect(() => parseRepoSlug('https://github.com/elastic')).toThrow(
      /Unable to derive owner\/repo/
    );
  });
});

describe('assertAllowedSecurityLabsRepo', () => {
  it('allows the elastic/security-labs-elastic-co repo', () => {
    expect(() =>
      assertAllowedSecurityLabsRepo({ owner: 'elastic', repo: 'security-labs-elastic-co' })
    ).not.toThrow();
  });

  it('allows the repo case-insensitively', () => {
    expect(() =>
      assertAllowedSecurityLabsRepo({ owner: 'Elastic', repo: 'Security-Labs-Elastic-Co' })
    ).not.toThrow();
  });

  it('rejects other GitHub repositories', () => {
    expect(() => assertAllowedSecurityLabsRepo({ owner: 'elastic', repo: 'kibana' })).toThrow(
      /Only \[elastic\/security-labs-elastic-co\] is allowed/
    );
  });
});
