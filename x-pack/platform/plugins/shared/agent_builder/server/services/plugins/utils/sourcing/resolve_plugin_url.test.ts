/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolvePluginUrl } from './resolve_plugin_url';

describe('resolvePluginUrl', () => {
  describe('GitHub tree URLs', () => {
    it('resolves a tree URL with a path', () => {
      const result = resolvePluginUrl(
        'https://github.com/anthropics/claude-code/tree/main/plugins/foo'
      );

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'https://github.com/anthropics/claude-code/archive/main.zip',
        pluginPath: 'plugins/foo',
      });
    });

    it('resolves a bare repo URL (plugin at root)', () => {
      const result = resolvePluginUrl('https://github.com/owner/repo');

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'https://github.com/owner/repo/archive/main.zip',
      });
    });

    it('resolves a tree URL at repo root', () => {
      const result = resolvePluginUrl('https://github.com/owner/repo/tree/develop');

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'https://github.com/owner/repo/archive/develop.zip',
      });
    });
  });

  describe('GitHub blob URLs to plugin.json', () => {
    it('resolves a blob URL to .claude-plugin/plugin.json', () => {
      const result = resolvePluginUrl(
        'https://github.com/anthropics/claude-code/blob/main/plugins/foo/.claude-plugin/plugin.json'
      );

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'https://github.com/anthropics/claude-code/archive/main.zip',
        pluginPath: 'plugins/foo',
      });
    });

    it('resolves a blob URL to plugin.json in a subfolder', () => {
      const result = resolvePluginUrl(
        'https://github.com/owner/repo/blob/main/plugins/foo/plugin.json'
      );

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'https://github.com/owner/repo/archive/main.zip',
        pluginPath: 'plugins/foo',
      });
    });

    it('resolves a blob URL to plugin.json at repo root', () => {
      const result = resolvePluginUrl('https://github.com/owner/repo/blob/main/plugin.json');

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'https://github.com/owner/repo/archive/main.zip',
      });
    });

    it('resolves a blob URL to .claude-plugin/plugin.json at repo root', () => {
      const result = resolvePluginUrl(
        'https://github.com/owner/repo/blob/main/.claude-plugin/plugin.json'
      );

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'https://github.com/owner/repo/archive/main.zip',
      });
    });
  });

  describe('direct zip URLs', () => {
    it('resolves a direct .zip URL', () => {
      const result = resolvePluginUrl('https://example.com/plugins/my-plugin.zip');

      expect(result).toEqual({
        type: 'zip',
        downloadUrl: 'https://example.com/plugins/my-plugin.zip',
      });
    });

    it('resolves a .zip URL with query parameters', () => {
      const result = resolvePluginUrl('https://example.com/plugin.zip?token=abc');

      expect(result).toEqual({
        type: 'zip',
        downloadUrl: 'https://example.com/plugin.zip?token=abc',
      });
    });
  });

  describe('unsupported URLs', () => {
    it('throws on an unsupported URL', () => {
      expect(() => resolvePluginUrl('https://example.com/plugin')).toThrow(
        /Unsupported plugin URL/
      );
    });

    it('throws on a non-URL string', () => {
      expect(() => resolvePluginUrl('not-a-url')).toThrow(/Unsupported plugin URL/);
    });
  });

  describe('custom githubBaseUrl', () => {
    const githubBaseUrl = 'http://localhost:9321';

    it('resolves a tree URL against the custom base', () => {
      const result = resolvePluginUrl('http://localhost:9321/owner/repo/tree/main/plugins/foo', {
        githubBaseUrl,
      });

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'http://localhost:9321/owner/repo/archive/main.zip',
        pluginPath: 'plugins/foo',
      });
    });

    it('resolves a bare repo URL against the custom base', () => {
      const result = resolvePluginUrl('http://localhost:9321/owner/repo', { githubBaseUrl });

      expect(result).toEqual({
        type: 'github',
        downloadUrl: 'http://localhost:9321/owner/repo/archive/main.zip',
      });
    });

    it('treats a github.com URL as unsupported when a custom base is provided', () => {
      expect(() => resolvePluginUrl('https://github.com/owner/repo', { githubBaseUrl })).toThrow(
        /Unsupported plugin URL/
      );
    });
  });
});
