/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseGithubUrl, getGithubArchiveUrl, isGithubUrl } from './parse_github_url';

describe('parseGithubUrl', () => {
  it('parses a full tree URL with ref and path', () => {
    const result = parseGithubUrl(
      'https://github.com/anthropics/claude-code/tree/main/plugins/explanatory-output-style'
    );

    expect(result).toEqual({
      owner: 'anthropics',
      repo: 'claude-code',
      ref: 'main',
      path: 'plugins/explanatory-output-style',
    });
  });

  it('parses a URL with ref but no path', () => {
    const result = parseGithubUrl('https://github.com/owner/repo/tree/develop');

    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'develop',
    });
  });

  it('parses a URL with just owner and repo', () => {
    const result = parseGithubUrl('https://github.com/owner/repo');

    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'main',
    });
  });

  it('defaults ref to main when not specified', () => {
    const result = parseGithubUrl('https://github.com/owner/repo');

    expect(result.ref).toBe('main');
  });

  it('handles .git suffix', () => {
    const result = parseGithubUrl('https://github.com/owner/repo.git');

    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'main',
    });
  });

  it('strips trailing slashes from path', () => {
    const result = parseGithubUrl('https://github.com/owner/repo/tree/main/some/path/');

    expect(result.path).toBe('some/path');
  });

  it('handles deeply nested paths', () => {
    const result = parseGithubUrl('https://github.com/owner/repo/tree/v2.0.0/a/b/c/d');

    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'v2.0.0',
      path: 'a/b/c/d',
    });
  });

  it('throws on invalid URLs', () => {
    expect(() => parseGithubUrl('https://gitlab.com/owner/repo')).toThrow(/Invalid GitHub URL/);
    expect(() => parseGithubUrl('not-a-url')).toThrow(/Invalid GitHub URL/);
    expect(() => parseGithubUrl('https://github.com/')).toThrow(/Invalid GitHub URL/);
    expect(() => parseGithubUrl('https://github.com/owner')).toThrow(/Invalid GitHub URL/);
  });

  it('handles http scheme', () => {
    const result = parseGithubUrl('http://github.com/owner/repo/tree/main/path');

    expect(result).toEqual({
      owner: 'owner',
      repo: 'repo',
      ref: 'main',
      path: 'path',
    });
  });

  describe('blob URLs', () => {
    it('parses a blob URL to a file', () => {
      const result = parseGithubUrl(
        'https://github.com/owner/repo/blob/main/plugins/foo/plugin.json'
      );

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        ref: 'main',
        path: 'plugins/foo/plugin.json',
      });
    });

    it('parses a blob URL to .claude-plugin/plugin.json', () => {
      const result = parseGithubUrl(
        'https://github.com/anthropics/claude-code/blob/main/plugins/foo/.claude-plugin/plugin.json'
      );

      expect(result).toEqual({
        owner: 'anthropics',
        repo: 'claude-code',
        ref: 'main',
        path: 'plugins/foo/.claude-plugin/plugin.json',
      });
    });

    it('parses a blob URL with a tag ref', () => {
      const result = parseGithubUrl('https://github.com/owner/repo/blob/v1.0.0/path/to/file.md');

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        ref: 'v1.0.0',
        path: 'path/to/file.md',
      });
    });
  });
});

describe('getGithubArchiveUrl', () => {
  it('builds the archive download URL', () => {
    const url = getGithubArchiveUrl({
      owner: 'anthropics',
      repo: 'claude-code',
      ref: 'main',
      path: 'plugins/explanatory-output-style',
    });

    expect(url).toBe('https://github.com/anthropics/claude-code/archive/main.zip');
  });

  it('works with tag refs', () => {
    const url = getGithubArchiveUrl({
      owner: 'owner',
      repo: 'repo',
      ref: 'v1.0.0',
    });

    expect(url).toBe('https://github.com/owner/repo/archive/v1.0.0.zip');
  });
});

describe('isGithubUrl', () => {
  it('returns true for GitHub tree URLs', () => {
    expect(isGithubUrl('https://github.com/owner/repo/tree/main/path')).toBe(true);
  });

  it('returns true for GitHub blob URLs', () => {
    expect(isGithubUrl('https://github.com/owner/repo/blob/main/file.json')).toBe(true);
  });

  it('returns true for bare GitHub repo URLs', () => {
    expect(isGithubUrl('https://github.com/owner/repo')).toBe(true);
  });

  it('returns false for non-GitHub URLs', () => {
    expect(isGithubUrl('https://example.com/plugin.zip')).toBe(false);
    expect(isGithubUrl('not-a-url')).toBe(false);
  });
});

describe('custom baseUrl', () => {
  const baseUrl = 'http://localhost:9321';

  describe('parseGithubUrl with custom baseUrl', () => {
    it('parses a tree URL with a custom base', () => {
      const result = parseGithubUrl(
        'http://localhost:9321/owner/repo/tree/main/plugins/foo',
        baseUrl
      );

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        ref: 'main',
        path: 'plugins/foo',
      });
    });

    it('parses a bare repo URL with a custom base', () => {
      const result = parseGithubUrl('http://localhost:9321/owner/repo', baseUrl);

      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        ref: 'main',
      });
    });

    it('rejects a github.com URL when a custom base is used', () => {
      expect(() => parseGithubUrl('https://github.com/owner/repo/tree/main/path', baseUrl)).toThrow(
        /Invalid GitHub URL/
      );
    });
  });

  describe('getGithubArchiveUrl with custom baseUrl', () => {
    it('builds the archive URL using the custom base', () => {
      const url = getGithubArchiveUrl({ owner: 'owner', repo: 'repo', ref: 'main' }, baseUrl);

      expect(url).toBe('http://localhost:9321/owner/repo/archive/main.zip');
    });
  });

  describe('isGithubUrl with custom baseUrl', () => {
    it('matches URLs against the custom base', () => {
      expect(isGithubUrl('http://localhost:9321/owner/repo/tree/main/path', baseUrl)).toBe(true);
      expect(isGithubUrl('http://localhost:9321/owner/repo', baseUrl)).toBe(true);
    });

    it('rejects github.com URLs when a custom base is provided', () => {
      expect(isGithubUrl('https://github.com/owner/repo', baseUrl)).toBe(false);
    });
  });
});
