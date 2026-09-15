/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs/promises';
import { spawn } from 'child_process';
import type { ToolingLog } from '@kbn/tooling-log';
import type { TaskConfig } from '../types';

/** Only this GitHub repo may be fetched as Security Labs KB content. */
export const ALLOWED_SECURITY_LABS_REPO_OWNER = 'elastic';
export const ALLOWED_SECURITY_LABS_REPO_NAME = 'security-labs-elastic-co';

/**
 * Derives the `owner/repo` slug from a GitHub repository URL (e.g.
 * `https://github.com/elastic/security-labs-elastic-co`) or an already-slug-shaped
 * value (e.g. `elastic/security-labs-elastic-co`).
 */
export const parseRepoSlug = (githubRepoUrl: string): { owner: string; repo: string } => {
  const trimmed = githubRepoUrl.trim();
  const pathname = trimmed.includes('://') ? new URL(trimmed).pathname : trimmed;
  const [owner, repoSegment] = pathname.split('/').filter(Boolean);
  const repo = repoSegment?.replace(/\.git$/i, '');

  if (!owner || !repo) {
    throw new Error(
      `Unable to derive owner/repo from githubRepoUrl [${githubRepoUrl}]. Expected ` +
        `"https://github.com/elastic/security-labs-elastic-co" or "elastic/security-labs-elastic-co".`
    );
  }

  return { owner, repo };
};

/**
 * Ensures GitHub fetches only pull from the Elastic Security Labs content repo.
 * Local/fork experimentation should use `--localContentPath` instead.
 */
export const assertAllowedSecurityLabsRepo = ({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}): void => {
  if (
    owner.toLowerCase() !== ALLOWED_SECURITY_LABS_REPO_OWNER ||
    repo.toLowerCase() !== ALLOWED_SECURITY_LABS_REPO_NAME
  ) {
    throw new Error(
      `Refusing to fetch Security Labs content from [${owner}/${repo}]. ` +
        `Only [${ALLOWED_SECURITY_LABS_REPO_OWNER}/${ALLOWED_SECURITY_LABS_REPO_NAME}] is allowed ` +
        `for GitHub fetches. Use --localContentPath for local or fork checkouts.`
    );
  }
};

/**
 * Builds child-process env that authenticates git against github.com via GitHub's
 * `x-access-token:<token>` Basic credential.
 *
 * Injecting the credential through git's `GIT_CONFIG_*` env vars (rather than argv or
 * persisted `.git/config`) keeps the token out of logs entirely and still applies it to
 * the lazy blob fetch that `git checkout` performs against the promisor remote, since that
 * subprocess inherits this env. The header is host-scoped so it is only ever sent to github.com.
 */
const buildGitAuthEnv = (token: string): NodeJS.ProcessEnv => {
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
  };
};

const runGit = async ({
  args,
  cwd,
  env,
  log,
}: {
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  log: ToolingLog;
}): Promise<void> => {
  log.debug(`Running: git ${args.join(' ')}`);

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env ? { ...process.env, ...env } : process.env,
    });
    let stderr = '';

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', rejectPromise);

    child.on('exit', (code: number | null) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(`git ${args.join(' ')} failed with exit code ${code}: ${stderr.trim()}`)
      );
    });
  });
};

/**
 * Performs a sparse, blobless partial checkout of just `contentSubPath` at `ref`.
 *
 * Only the article markdown (plus a handful of tiny ancestor-directory files implied
 * by cone-mode sparse checkout) is ever downloaded — the rest of the large website
 * repository (e.g. `public/` images, `src/`) is never transferred. Blobs for the sparse
 * paths are fetched lazily during `checkout` via the promisor remote; auth is supplied
 * through `gitEnv` so that lazy fetch stays authenticated.
 */
const sparseCheckoutContent = async ({
  owner,
  repo,
  ref,
  contentSubPath,
  token,
  destFolder,
  log,
}: {
  owner: string;
  repo: string;
  ref: string;
  contentSubPath: string;
  token?: string;
  destFolder: string;
  log: ToolingLog;
}): Promise<void> => {
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  const env = token ? buildGitAuthEnv(token) : undefined;

  await Fs.mkdir(destFolder, { recursive: true });

  await runGit({ args: ['init', '--quiet'], cwd: destFolder, env, log });
  await runGit({ args: ['remote', 'add', 'origin', cloneUrl], cwd: destFolder, env, log });

  if (contentSubPath) {
    await runGit({ args: ['sparse-checkout', 'set', contentSubPath], cwd: destFolder, env, log });
  }

  // `--filter=blob:none` turns origin into a promisor remote, so only the tree metadata is
  // fetched up front and blobs for the sparse paths are pulled lazily during `checkout`.
  await runGit({
    args: ['fetch', '--filter=blob:none', '--depth', '1', '--no-tags', 'origin', ref],
    cwd: destFolder,
    env,
    log,
  });
  await runGit({ args: ['checkout', '--quiet', 'FETCH_HEAD'], cwd: destFolder, env, log });

  // Drop the git metadata now that the working tree is materialized.
  await Fs.rm(Path.join(destFolder, '.git'), { recursive: true, force: true });
};

/**
 * Fetches Security Labs content from a GitHub repository or uses a local path.
 * Returns the path to the directory that holds the article markdown files.
 */
export const fetchContent = async ({
  config,
  log,
}: {
  config: TaskConfig;
  log: ToolingLog;
}): Promise<string> => {
  // If a local content path is provided, use it directly.
  if (config.localContentPath) {
    log.info(`Using local content path: ${config.localContentPath}`);

    try {
      await Fs.access(config.localContentPath);
    } catch {
      throw new Error(`Local content path does not exist: ${config.localContentPath}`);
    }

    return config.localContentPath;
  }

  const { owner, repo } = parseRepoSlug(config.githubRepoUrl);
  assertAllowedSecurityLabsRepo({ owner, repo });
  const ref = config.githubRef;
  const contentSubPath = config.contentSubPath.replace(/^\/+/, '').replace(/\/+$/, '');

  log.info(
    `Fetching content from GitHub: ${owner}/${repo}@${ref} (subpath: ${contentSubPath || '<root>'})`
  );

  const destFolder = Path.join(config.buildFolder, 'content-repo');
  // Start from a clean slate so `git init` never runs against a stale checkout.
  await Fs.rm(destFolder, { recursive: true, force: true });

  try {
    await sparseCheckoutContent({
      owner,
      repo,
      ref,
      contentSubPath,
      token: config.githubToken,
      destFolder,
      log,
    });
  } catch (err) {
    if (!config.githubToken) {
      throw new Error(
        `${
          err instanceof Error ? err.message : String(err)
        }\nThe repository is internal-only; pass --githubToken (or set GITHUB_TOKEN).`
      );
    }
    throw err;
  }

  const articlesPath = contentSubPath ? Path.join(destFolder, contentSubPath) : destFolder;

  try {
    await Fs.access(articlesPath);
  } catch {
    throw new Error(
      `Extracted content path does not exist: ${articlesPath}. ` +
        `Check that [${contentSubPath}] exists in ${owner}/${repo}@${ref}.`
    );
  }

  return articlesPath;
};
