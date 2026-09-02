/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/** A single matched line returned by {@link CodeboxClient.grep}. */
export interface CodeboxGrepHit {
  ref: string;
  path: string;
  lineNumber: number;
  content: string;
}

/** A tree entry returned by {@link CodeboxClient.tree}. */
export interface CodeboxTreeEntry {
  mode: string;
  type: 'blob' | 'tree';
  hash: string;
  size?: number;
  name: string;
}

/** A cloned repository returned by {@link CodeboxClient.listRepos}. */
export interface CodeboxRepo {
  name: string;
  status: 'queued' | 'cloning' | 'ready' | 'failed';
  jobId: string;
}

/** Language histogram entry returned by {@link CodeboxClient.languages}. */
export interface CodeboxLanguageEntry {
  files: number;
  bytes: number;
}

/** Options for {@link CodeboxClient.grep}. */
export interface CodeboxGrepOptions {
  org: string;
  repo: string;
  pattern: string;
  ref?: string;
  path?: string;
  ignoreCase?: boolean;
  contextLines?: number;
  maxCount?: number;
}

/** Options for {@link CodeboxClient.show}. */
export interface CodeboxShowOptions {
  org: string;
  repo: string;
  ref: string;
  path: string;
  head?: number;
  tail?: number;
  lines?: string;
}

/** Options for {@link CodeboxClient.tree}. */
export interface CodeboxTreeOptions {
  org: string;
  repo: string;
  ref: string;
  path?: string;
  /** Return entries at all depths (`git ls-tree -r`). */
  recursive?: boolean;
  /** Return a flat `string[]` of paths instead of full entry objects. */
  nameOnly?: boolean;
}

/** Options for {@link CodeboxClient.languages}. */
export interface CodeboxLanguagesOptions {
  org: string;
  repo: string;
  ref?: string;
}

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { MAX_GREP_HITS } from './constants';

/**
 * Deterministic connector ID for the Codebox `.http` connector, provisioned by
 * `codebox install.ts`. This is the same UUID the provisioner uses — it is
 * stable across installs so the plugin can reference it without a runtime lookup.
 */
export const CODEBOX_CONNECTOR_ID = '20c92e6c-8b1a-5f3e-9d2a-6b7c8e9f0a1b';
const TREE_PAGE_SIZE = 2_000;
const MAX_TREE_PATHS = 1_000_000;

/**
 * Minimal interface for executing an HTTP connector action. Matches the
 * `ActionsClient.execute` method from `@kbn/actions-plugin/server` so the
 * client can be constructed from a scoped actions client without importing the
 * full plugin type hierarchy.
 */
export interface ConnectorExecutor {
  execute(params: {
    actionId: string;
    params: Record<string, unknown>;
  }): Promise<{ status: string; data?: unknown; message?: string }>;
}

export interface CodeboxClientConfig {
  executor: ConnectorExecutor;
  logger: Logger;
}

/**
 * Typed HTTP client for the Codebox git repository API. Routes every request
 * through the Codebox `.http` connector (managed by `codebox install.ts`) via
 * the Kibana Actions plugin, so the base URL and Bearer auth are injected from
 * the connector's saved config/secrets — no environment variables needed.
 *
 * Every method returns parsed, typed data. Connector execution errors are
 * logged and re-thrown so callers can handle them uniformly.
 */
export class CodeboxClient {
  private readonly executor: ConnectorExecutor;
  private readonly logger: Logger;

  constructor(config: CodeboxClientConfig) {
    this.executor = config.executor;
    this.logger = config.logger;
  }

  /** Health check — `GET /health`. */
  async health(): Promise<{ status: string }> {
    return this.request('GET', '/health') as Promise<{ status: string }>;
  }

  /** List all cloned repositories — `GET /repos`. */
  async listRepos(): Promise<CodeboxRepo[]> {
    return this.request('GET', '/repos') as Promise<CodeboxRepo[]>;
  }

  /**
   * Grep file contents — `GET /repos/:org/:repo/grep`.
   *
   * Returns parsed line hits. The Codebox endpoint returns plain text in
   * `ref:path:lineNumber:content` format; the connector returns the response
   * body as a string, which this method parses into typed objects.
   */
  async grep(options: CodeboxGrepOptions): Promise<CodeboxGrepHit[]> {
    const { org, repo, pattern, ref, path, ignoreCase, contextLines, maxCount } = options;
    const query = new URLSearchParams({ pattern, extendedRegex: 'true' });
    if (ref) query.set('ref', ref);
    if (path) query.set('path', path);
    if (ignoreCase) query.set('ignoreCase', 'true');
    if (contextLines !== undefined) query.set('contextLines', String(contextLines));
    // Always cap maxCount to prevent unbounded responses from degenerate
    // patterns. Callers may pass a lower value; the cap is a safety net.
    query.set('maxCount', String(maxCount ?? MAX_GREP_HITS));

    const data = await this.request('GET', `/repos/${org}/${repo}/grep?${query}`);
    if (typeof data === 'string') {
      return parseGrepOutput(data);
    }
    return [];
  }

  /**
   * Read file contents — `GET /repos/:org/:repo/show/:ref/path`.
   *
   * Returns the raw file text. When line-selection params are provided,
   * returns only the requested range.
   */
  async show(options: CodeboxShowOptions): Promise<string> {
    const { org, repo, ref, path, head, tail, lines } = options;
    const encodedRef = encodeURIComponent(ref);
    const query = new URLSearchParams();
    if (head !== undefined) query.set('head', String(head));
    if (tail !== undefined) query.set('tail', String(tail));
    if (lines) query.set('lines', lines);

    const qs = query.toString();
    const url = `/repos/${org}/${repo}/show/${encodedRef}/${path}${qs ? `?${qs}` : ''}`;
    const data = await this.request('GET', url);
    return typeof data === 'string' ? data : JSON.stringify(data);
  }

  /**
   * List directory tree — `GET /repos/:org/:repo/tree/:ref[/path]`.
   *
   * With `recursive: true, nameOnly: true`, returns a flat `string[]` of all
   * repo-relative file paths (backed by `git ls-tree -r --name-only`).
   */
  async tree(options: CodeboxTreeOptions): Promise<CodeboxTreeEntry[] | string[]> {
    const { org, repo, ref, path, recursive, nameOnly } = options;
    const encodedRef = encodeURIComponent(ref);
    const pathSuffix = path ? `/${path}` : '';
    const query = new URLSearchParams();
    if (recursive) query.set('recursive', 'true');
    if (nameOnly) query.set('nameOnly', 'true');
    const treePath = `/repos/${org}/${repo}/tree/${encodedRef}${pathSuffix}`;

    if (recursive && nameOnly) {
      const paths: string[] = [];
      for (let offset = 0; ; offset += TREE_PAGE_SIZE) {
        query.set('offset', String(offset));
        query.set('limit', String(TREE_PAGE_SIZE));
        const page = await this.request('GET', `${treePath}?${query}`);
        if (!Array.isArray(page) || !page.every((entry) => typeof entry === 'string')) {
          throw new Error(`Codebox returned an invalid tree page for ${org}/${repo}`);
        }
        if (offset > 0 && page[0] === paths[0]) {
          throw new Error(
            `Codebox tree pagination is not supported by the server for ${org}/${repo}`
          );
        }
        paths.push(...page);
        if (paths.length > MAX_TREE_PATHS) {
          throw new Error(`Codebox tree for ${org}/${repo} exceeds ${MAX_TREE_PATHS} paths`);
        }
        if (page.length < TREE_PAGE_SIZE) break;
      }
      return paths;
    }

    const qs = query.toString();
    return this.request('GET', `${treePath}${qs ? `?${qs}` : ''}`) as Promise<
      CodeboxTreeEntry[] | string[]
    >;
  }

  /**
   * Language histogram — `GET /repos/:org/:repo/languages`.
   *
   * Returns `{ [language]: { files, bytes } }`.
   */
  async languages(options: CodeboxLanguagesOptions): Promise<Record<string, CodeboxLanguageEntry>> {
    const { org, repo, ref } = options;
    const query = new URLSearchParams();
    if (ref) query.set('ref', ref);
    const qs = query.toString();
    return this.request('GET', `/repos/${org}/${repo}/languages${qs ? `?${qs}` : ''}`) as Promise<
      Record<string, CodeboxLanguageEntry>
    >;
  }

  /**
   * List refs — `GET /repos/:org/:repo/refs`.
   */
  async refs(
    org: string,
    repo: string,
    type?: 'heads' | 'tags'
  ): Promise<Array<{ hash: string; ref: string; name: string; type: string; date: string }>> {
    const query = new URLSearchParams();
    if (type) query.set('type', type);
    const qs = query.toString();
    return this.request('GET', `/repos/${org}/${repo}/refs${qs ? `?${qs}` : ''}`) as Promise<
      Array<{ hash: string; ref: string; name: string; type: string; date: string }>
    >;
  }

  /**
   * Resolve the HEAD commit SHA — `GET /repos/:org/:repo/log?ref=HEAD&limit=1`.
   * Returns the short hash of the latest commit on HEAD, or `undefined` if the
   * repo has no commits.
   */
  async resolveHead(org: string, repo: string): Promise<string | undefined> {
    const data = await this.request('GET', `/repos/${org}/${repo}/log?ref=HEAD&limit=1`);
    // The log endpoint returns plain text with the commit hash on the first line.
    if (typeof data === 'string') {
      const firstLine = data.trim().split('\n')[0]?.trim();
      // The hash is the first line (40-char hex), or after "commit " prefix
      const match = firstLine?.match(/^(?:commit\s+)?([0-9a-f]{7,40})/);
      return match?.[1];
    }
    return undefined;
  }

  /**
   * Execute an HTTP request through the Codebox `.http` connector. The
   * connector injects the base URL and `Authorization: Bearer <key>` from its
   * saved config/secrets.
   *
   * The `.http` connector wraps the upstream response in
   * `{ status, data: { status: <httpCode>, data: <body>, headers } }`.
   * This method unwraps to the inner `data` (the actual Codebox response body).
   */
  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const result = await this.executor.execute({
      actionId: CODEBOX_CONNECTOR_ID,
      params: {
        method,
        path,
        ...(body !== undefined ? { body } : {}),
      },
    });

    if (result.status === 'error') {
      const message = `Codebox ${method} ${path} failed: ${result.message ?? 'unknown error'}`;
      this.logger.error(message);
      throw new Error(message);
    }

    // Unwrap the .http connector envelope: result.data is
    // { status: <httpCode>, statusText, headers, data: <actualBody> }
    const envelope = result.data as { status?: number; data?: unknown } | undefined;
    if (envelope && typeof envelope === 'object' && 'data' in envelope) {
      const httpStatus = envelope.status;
      if (typeof httpStatus === 'number' && httpStatus >= 400) {
        const message = `Codebox ${method} ${path} failed: HTTP ${httpStatus}`;
        this.logger.error(message);
        throw new Error(message);
      }
      return envelope.data;
    }

    return result.data;
  }
}

/**
 * Creates a {@link CodeboxClient} from a scoped Kibana Actions client. The
 * actions client handles connector auth injection, so no env vars are needed.
 *
 * Call from a route handler where `request` is available:
 * ```ts
 * const actionsClient = await server.actions.getActionsClientWithRequest(request);
 * const codebox = createCodeboxClient({ actionsClient, logger });
 * ```
 */
export const createCodeboxClient = ({
  actionsClient,
  logger,
}: {
  actionsClient: ConnectorExecutor;
  logger: Logger;
}): CodeboxClient => new CodeboxClient({ executor: actionsClient, logger });

/**
 * Creates a {@link CodeboxClient} from the Actions plugin start contract and a
 * scoped request. Convenience wrapper that resolves the scoped actions client
 * internally.
 */
export const getCodeboxClient = async ({
  actions,
  request,
  logger,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<CodeboxClient> => {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  return createCodeboxClient({
    actionsClient: actionsClient as unknown as ConnectorExecutor,
    logger,
  });
};

/**
 * Parses Codebox grep plain-text output into typed hits.
 *
 * Output format: `ref:path:lineNumber:content` per line.
 * Context lines (from `contextLines`) use `ref:path:lineNumber-content` (dash
 * instead of colon after the line number). Lines matching `--` are group
 * separators and are skipped.
 */
function parseGrepOutput(text: string): CodeboxGrepHit[] {
  if (!text.trim()) return [];

  const hits: CodeboxGrepHit[] = [];
  for (const line of text.split('\n')) {
    if (!line || line === '--') continue;

    // Format: ref:path:lineNumber:content (match) or ref:path:lineNumber-content (context)
    // We need to parse carefully since path can contain colons
    const match = line.match(/^([^:]+):(.+?):(\d+)([:-])(.*)$/);
    if (match) {
      hits.push({
        ref: match[1],
        path: match[2],
        lineNumber: parseInt(match[3], 10),
        content: match[5],
      });
    }
  }
  return hits;
}
