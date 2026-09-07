/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common';
import { isGithubUrl, parseGithubUrl, getGithubArchiveUrl } from './parse_github_url';

/**
 * A direct zip file URL. The zip itself contains the plugin at its root.
 */
export interface ZipPluginUrl {
  type: 'zip';
  downloadUrl: string;
}

/**
 * A GitHub-hosted plugin. The entire repo archive is downloaded as a zip,
 * then scoped to `pluginPath` within it.
 */
export interface GithubPluginUrl {
  type: 'github';
  downloadUrl: string;
  pluginPath?: string;
}

export type ResolvedPluginUrl = ZipPluginUrl | GithubPluginUrl;

export interface ResolvePluginUrlOptions {
  githubBaseUrl?: string;
}

/**
 * Classifies a URL and resolves it into a normalized descriptor
 * that `parsePluginFromUrl` can consume.
 *
 * Supported inputs:
 * - GitHub folder URL (`/tree/`)  -> download repo archive, scope to folder
 * - GitHub `plugin.json` blob URL (`/blob/`) -> derive the plugin folder, then same as above
 * - Direct `.zip` URL -> download the zip as-is
 */
export const resolvePluginUrl = (
  url: string,
  options: ResolvePluginUrlOptions = {}
): ResolvedPluginUrl => {
  const { githubBaseUrl } = options;

  if (looksLikeZipUrl(url)) {
    return { type: 'zip', downloadUrl: url };
  }

  if (isGithubUrl(url, githubBaseUrl)) {
    return resolveGithubUrl(url, githubBaseUrl);
  }

  throw createBadRequestError(
    `Unsupported plugin URL: "${url}". Provide a GitHub repository URL or a direct link to a .zip file.`
  );
};

const resolveGithubUrl = (url: string, githubBaseUrl?: string): GithubPluginUrl => {
  const info = parseGithubUrl(url, githubBaseUrl);
  const downloadUrl = getGithubArchiveUrl(info, githubBaseUrl);

  const pluginPath = derivePluginPath(info.path);

  return {
    type: 'github',
    downloadUrl,
    ...(pluginPath !== undefined && { pluginPath }),
  };
};

/**
 * Given the raw path from a GitHub URL, derives the plugin root folder.
 *
 * - `/tree/main/plugins/foo` -> `plugins/foo` (path is the plugin folder)
 * - `/blob/main/plugins/foo/plugin.json` -> `plugins/foo`
 * - `/blob/main/plugins/foo/.claude-plugin/plugin.json` -> `plugins/foo`
 * - no path -> undefined (plugin is at repo root)
 */
const derivePluginPath = (rawPath?: string): string | undefined => {
  if (!rawPath) {
    return undefined;
  }

  // .claude-plugin/plugin.json at repo root
  if (rawPath === '.claude-plugin/plugin.json') {
    return undefined;
  }
  // plugin.json at repo root
  if (rawPath === 'plugin.json') {
    return undefined;
  }

  // .claude-plugin/plugin.json inside a subfolder
  if (rawPath.endsWith('/.claude-plugin/plugin.json')) {
    return rawPath.slice(0, -'/.claude-plugin/plugin.json'.length);
  }
  // plugin.json inside a subfolder
  if (rawPath.endsWith('/plugin.json')) {
    return rawPath.slice(0, -'/plugin.json'.length);
  }

  return rawPath;
};

const looksLikeZipUrl = (url: string): boolean => {
  try {
    const { pathname } = new URL(url);
    return pathname.endsWith('.zip');
  } catch {
    return false;
  }
};
