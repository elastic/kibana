/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { GoogleAuth } from 'google-auth-library';
import { REPO_ROOT } from '@kbn/repo-info';

export const GROUND_TRUTH_DIR_ENV = 'KBN_EVALS_GROUND_TRUTH_DIR';

const GCS_API_BASE = 'https://storage.googleapis.com/storage/v1';
const GCS_READ_ONLY_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';
const ERROR_BODY_EXCERPT_LENGTH = 500;

export interface GroundTruthSource {
  bucket: string;
  /** Object-name prefix including the trailing slash, e.g. `2026-03-27/`. */
  prefix: string;
}

export interface GroundTruthEntry {
  /** Path relative to the ground-truth root, always '/'-separated. */
  relativePath: string;
  json: unknown;
}

export interface EnsureGroundTruthDirOptions {
  source: GroundTruthSource;
  env?: NodeJS.ProcessEnv;
  /** Test seam. */
  fetchImpl?: typeof fetch;
  /** Defaults to `<repo>/target/evals/ground-truth/<bucket>/<prefix>`. Wiped before download. */
  targetDir?: string;
  log?: (message: string) => void;
}

const missingDirMessage = (): string =>
  `${GROUND_TRUTH_DIR_ENV} is not set. Ground truth is downloaded by the @kbn/evals global setup ` +
  `when the suite passes \`groundTruth\` to createPlaywrightEvalsConfig: run the suite via ` +
  `\`node scripts/evals run --suite <name>\`. Playwright modes that skip global setup (--list, IDE ` +
  `runners) and standalone scripts must set ${GROUND_TRUTH_DIR_ENV} to a local directory that ` +
  `contains the ground-truth JSON files.`;

const createAuthorizedFetch = (credentialsJson: string, fetchImpl: typeof fetch) => {
  let credentials: object;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    throw new Error('GCS_CREDENTIALS is not valid JSON; expected a service-account key object');
  }
  const auth = new GoogleAuth({ credentials, scopes: [GCS_READ_ONLY_SCOPE] });

  return async (url: string): Promise<Response> => {
    const token = await auth.getAccessToken();
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const body = (await response.text()).slice(0, ERROR_BODY_EXCERPT_LENGTH);
      throw new Error(
        `GCS request failed (${response.status} ${response.statusText}) for ${url}: ${body}`
      );
    }
    return response;
  };
};

interface ListObjectsResponse {
  items?: Array<{ name: string }>;
  nextPageToken?: string;
}

const listJsonObjectNames = async (
  request: (url: string) => Promise<Response>,
  { bucket, prefix }: GroundTruthSource
): Promise<string[]> => {
  const names: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      prefix,
      matchGlob: `${prefix}**/*.json`,
      fields: 'items(name),nextPageToken',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }
    const response = await request(`${GCS_API_BASE}/b/${encodeURIComponent(bucket)}/o?${params}`);
    const page = (await response.json()) as ListObjectsResponse;
    names.push(...(page.items ?? []).map((item) => item.name));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return names;
};

const defaultTargetDir = ({ bucket, prefix }: GroundTruthSource): string =>
  Path.join(REPO_ROOT, 'target/evals/ground-truth', bucket, prefix.replace(/\/+$/, ''));

/**
 * Makes ground truth available on local disk and exports its location in
 * `KBN_EVALS_GROUND_TRUTH_DIR`. Honours a pre-set override directory; otherwise downloads every
 * `*.json` object under the source prefix into `targetDir`.
 */
export const ensureGroundTruthDir = async ({
  source,
  env = process.env,
  fetchImpl = fetch,
  targetDir = defaultTargetDir(source),
  log = () => {},
}: EnsureGroundTruthDirOptions): Promise<{ dir: string; fileCount: number }> => {
  const override = env[GROUND_TRUTH_DIR_ENV];
  if (override) {
    if (!Fs.existsSync(override) || !Fs.statSync(override).isDirectory()) {
      throw new Error(`${GROUND_TRUTH_DIR_ENV}=${override} is not a directory`);
    }
    log(`[ground-truth] Using local ground truth from ${override}; GCS is not consulted`);
    return { dir: override, fileCount: readGroundTruthTreeSync({ env }).length };
  }

  const location = `gs://${source.bucket}/${source.prefix}`;
  if (!env.GCS_CREDENTIALS) {
    throw new Error(
      `Cannot load ground truth from ${location}: GCS_CREDENTIALS is not set. Either set ` +
        `GCS_CREDENTIALS (service-account key JSON) or set ${GROUND_TRUTH_DIR_ENV} to a local ` +
        `directory containing the ground-truth files.`
    );
  }

  const request = createAuthorizedFetch(env.GCS_CREDENTIALS, fetchImpl);
  const objectNames = await listJsonObjectNames(request, source);
  if (objectNames.length === 0) {
    throw new Error(
      `No ground-truth files found at ${location}. Check the bucket, prefix and run id.`
    );
  }

  const resolvedTargetDir = Path.resolve(targetDir);
  Fs.rmSync(resolvedTargetDir, { recursive: true, force: true });
  Fs.mkdirSync(resolvedTargetDir, { recursive: true });
  for (const objectName of objectNames) {
    const relativePath = objectName.slice(source.prefix.length);
    const target = Path.resolve(resolvedTargetDir, ...relativePath.split('/'));
    if (!target.startsWith(`${resolvedTargetDir}${Path.sep}`)) {
      throw new Error(`Refusing to write object outside the ground-truth directory: ${objectName}`);
    }
    Fs.mkdirSync(Path.dirname(target), { recursive: true });
    const response = await request(
      `${GCS_API_BASE}/b/${encodeURIComponent(source.bucket)}/o/${encodeURIComponent(
        objectName
      )}?alt=media`
    );
    Fs.writeFileSync(target, await response.text());
  }

  env[GROUND_TRUTH_DIR_ENV] = targetDir;
  log(`[ground-truth] Downloaded ${objectNames.length} files from ${location} to ${targetDir}`);
  return { dir: targetDir, fileCount: objectNames.length };
};

const collectJsonFiles = (root: string, dir: string, out: GroundTruthEntry[]): void => {
  for (const dirent of Fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = Path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      collectJsonFiles(root, absolutePath, out);
      continue;
    }
    if (!dirent.isFile() || !dirent.name.endsWith('.json')) {
      continue;
    }
    const relativePath = Path.relative(root, absolutePath).split(Path.sep).join('/');
    try {
      out.push({ relativePath, json: JSON.parse(Fs.readFileSync(absolutePath, 'utf8')) });
    } catch (error) {
      throw new Error(
        `Failed to parse ground-truth file ${relativePath}: ${(error as Error).message}`
      );
    }
  }
};

/**
 * Reads every `*.json` under `KBN_EVALS_GROUND_TRUTH_DIR`, sorted by relative path. Synchronous
 * on purpose: Playwright builds the describe tree synchronously.
 */
export const readGroundTruthTreeSync = ({
  env = process.env,
}: { env?: NodeJS.ProcessEnv } = {}): GroundTruthEntry[] => {
  const dir = env[GROUND_TRUTH_DIR_ENV];
  if (!dir) {
    throw new Error(missingDirMessage());
  }
  if (!Fs.existsSync(dir) || !Fs.statSync(dir).isDirectory()) {
    throw new Error(`${GROUND_TRUTH_DIR_ENV}=${dir} is not a directory`);
  }
  const entries: GroundTruthEntry[] = [];
  collectJsonFiles(dir, dir, entries);
  return entries.sort((a, b) => {
    if (a.relativePath < b.relativePath) {
      return -1;
    }
    return a.relativePath > b.relativePath ? 1 : 0;
  });
};
