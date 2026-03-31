/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GithubUrlInfo {
  owner: string;
  repo: string;
  /** Branch, tag or commit. Defaults to 'main' when not present in the URL. */
  ref: string;
  /** Path within the repository (without leading/trailing slashes), or undefined for root. */
  path?: string;
}

const DEFAULT_GITHUB_BASE_URL = 'https://github.com';

const escapeForRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildGithubUrlRegex = (baseUrl: string): RegExp => {
  const { host } = new URL(baseUrl);
  return new RegExp(
    `^https?:\\/\\/${escapeForRegex(
      host
    )}\\/(?<owner>[^/]+)\\/(?<repo>[^/]+?)(?:\\.git)?(?:\\/(?:tree|blob)\\/(?<ref>[^/]+)(?:\\/(?<path>.+))?)?$`
  );
};

const defaultGithubUrlRegex = buildGithubUrlRegex(DEFAULT_GITHUB_BASE_URL);

/**
 * Parses a GitHub repository URL into its components.
 *
 * Supported formats:
 * - `{baseUrl}/{owner}/{repo}`
 * - `{baseUrl}/{owner}/{repo}.git`
 * - `{baseUrl}/{owner}/{repo}/tree/{ref}`
 * - `{baseUrl}/{owner}/{repo}/tree/{ref}/{path}`
 * - `{baseUrl}/{owner}/{repo}/blob/{ref}/{path}`
 */
export const parseGithubUrl = (url: string, baseUrl?: string): GithubUrlInfo => {
  const regex = baseUrl ? buildGithubUrlRegex(baseUrl) : defaultGithubUrlRegex;
  const match = url.match(regex);
  if (!match?.groups) {
    throw new Error(
      `Invalid GitHub URL: "${url}". Expected format: https://github.com/{owner}/{repo}/tree/{ref}/{path}`
    );
  }

  const { owner, repo, ref, path: rawPath } = match.groups;
  const cleanedPath = rawPath?.replace(/\/+$/, '');

  return {
    owner,
    repo,
    ref: ref ?? 'main',
    ...(cleanedPath && { path: cleanedPath }),
  };
};

/**
 * Returns the URL to download the repository archive as a zip file.
 */
export const getGithubArchiveUrl = (
  { owner, repo, ref }: GithubUrlInfo,
  baseUrl: string = DEFAULT_GITHUB_BASE_URL
): string => {
  return `${baseUrl}/${owner}/${repo}/archive/${ref}.zip`;
};

/**
 * Checks whether a URL is a GitHub URL (tree, blob, or bare repo).
 */
export const isGithubUrl = (url: string, baseUrl?: string): boolean => {
  const regex = baseUrl ? buildGithubUrlRegex(baseUrl) : defaultGithubUrlRegex;
  return regex.test(url);
};
