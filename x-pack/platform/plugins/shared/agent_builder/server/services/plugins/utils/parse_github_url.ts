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

const githubUrlRegex =
  /^https?:\/\/github\.com\/(?<owner>[^/]+)\/(?<repo>[^/]+?)(?:\.git)?(?:\/(?:tree|blob)\/(?<ref>[^/]+)(?:\/(?<path>.+))?)?$/;

/**
 * Parses a GitHub repository URL into its components.
 *
 * Supported formats:
 * - `https://github.com/{owner}/{repo}`
 * - `https://github.com/{owner}/{repo}.git`
 * - `https://github.com/{owner}/{repo}/tree/{ref}`
 * - `https://github.com/{owner}/{repo}/tree/{ref}/{path}`
 * - `https://github.com/{owner}/{repo}/blob/{ref}/{path}`
 */
export const parseGithubUrl = (url: string): GithubUrlInfo => {
  const match = url.match(githubUrlRegex);
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
export const getGithubArchiveUrl = ({ owner, repo, ref }: GithubUrlInfo): string => {
  return `https://github.com/${owner}/${repo}/archive/${ref}.zip`;
};

/**
 * Checks whether a URL is a GitHub URL (tree, blob, or bare repo).
 */
export const isGithubUrl = (url: string): boolean => {
  return githubUrlRegex.test(url);
};
