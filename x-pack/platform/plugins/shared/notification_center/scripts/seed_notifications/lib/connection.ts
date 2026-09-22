/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { Client } from '@elastic/elasticsearch';
import { unflattenObject } from '@kbn/object-utils';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';

export interface SeedConnection {
  esUrl: string;
  kibanaUrl: string;
  username: string;
  password: string;
}

/** Local kbn-dev Kibana ports. */
const LOCAL_KIBANA_PORTS = [5601, 5611] as const;

/**
 * Cluster that belongs to each local Kibana. Serverless ES is HTTPS with a
 * self-signed cert and authenticates as `elastic_serverless`, not `elastic`.
 */
const LOCAL_CLUSTER_BY_KIBANA_PORT: Record<string, { esUrl: string; username: string }> = {
  '5601': { esUrl: 'https://localhost:9200', username: 'elastic_serverless' },
  '5611': { esUrl: 'http://localhost:9201', username: 'elastic' },
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const stripTrailingSlash = (url: string): string => url.replace(/\/$/, '');

/** `localhost:5601` is accepted; the ES client and fetch both require a scheme. */
const toHttpUrl = (raw: string): string => {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return stripTrailingSlash(withProtocol);
};

export const createEsClient = ({ esUrl, username, password }: SeedConnection): Client =>
  new Client({
    node: esUrl,
    auth: { username, password },
    ...(esUrl.startsWith('https:') && { tls: { rejectUnauthorized: false } }),
  });

interface DevYml {
  elasticsearch?: { hosts?: string | string[] };
}

/** Reads `elasticsearch.hosts` from `config/kibana.dev.yml`, accepting flat or nested keys. */
const readDevEsUrl = (): string | undefined => {
  const configPath = path.resolve(REPO_ROOT, 'config/kibana.dev.yml');
  if (!fs.existsSync(configPath)) {
    return undefined;
  }

  const raw = (parse(fs.readFileSync(configPath, 'utf8')) ?? {}) as Record<string, unknown>;
  const loaded = unflattenObject(raw) as DevYml;
  const { hosts } = loaded.elasticsearch ?? {};
  const first = Array.isArray(hosts) ? hosts[0] : hosts;
  return first !== undefined ? String(first) : undefined;
};

/**
 * Kibana answers any unrecognised path with the SPA shell and a 200, so a status code alone
 * proves nothing — only a JSON body carrying a status does.
 */
const servesKibana = async (url: string): Promise<boolean> => {
  const response = await fetch(`${url}/api/status`, { redirect: 'manual' }).catch(() => undefined);
  if (!response?.ok || !response.headers.get('content-type')?.includes('application/json')) {
    return false;
  }
  const body = await response.json().catch(() => undefined);
  return typeof body?.status?.overall?.level === 'string';
};

/** First path segment of a redirect Location, so `/xyz/login` yields `/xyz`. */
const basePathFromLocation = (location: string): string | undefined => {
  const pathname = URL.canParse(location) ? new URL(location).pathname : location;
  const segment = pathname.split('/').find((part) => part.length > 0);
  return segment ? `/${segment}` : undefined;
};

/**
 * A dev Kibana mounts itself under a base path and redirects the root to it — a random
 * three-character one by default, or whatever `server.basePath` says. Follow that redirect
 * and keep the prefix only if it actually serves the status API.
 *
 * Runs even when `--kibana-url` is passed explicitly, so a bare host:port always works.
 */
const resolveBasePath = async (
  url: string,
  log: ToolingLog,
  { warn }: { warn: boolean }
): Promise<string> => {
  const origin = stripTrailingSlash(url);
  try {
    const response = await fetch(origin, { method: 'GET', redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) {
      return origin;
    }
    const prefix = basePathFromLocation(response.headers.get('location') ?? '');
    if (!prefix) {
      return origin;
    }
    const candidate = `${origin}${prefix}`;
    if (await servesKibana(candidate)) {
      log.debug(`Detected base path ${prefix}`);
      return candidate;
    }
  } catch (error) {
    if (warn) {
      log.warning(`Could not probe ${origin} for a base path: ${errorMessage(error)}`);
    }
  }
  return origin;
};

const discoverKibanaUrl = async (log: ToolingLog): Promise<string> => {
  const found: string[] = [];
  for (const port of LOCAL_KIBANA_PORTS) {
    const resolved = await resolveBasePath(`http://localhost:${port}`, log, { warn: false });
    if (await servesKibana(resolved)) {
      found.push(resolved);
    }
  }

  const [only] = found;
  if (only && found.length === 1) {
    return only;
  }
  if (found.length > 1) {
    throw new Error(
      'Both localhost:5601 (serverless) and localhost:5611 (stack) are running. Pass --kibana-url.'
    );
  }
  throw new Error(
    'Could not reach Kibana on localhost:5601 (serverless) or localhost:5611 (stack). Pass --kibana-url.'
  );
};

const clusterForKibana = (kibanaUrl: string) =>
  LOCAL_CLUSTER_BY_KIBANA_PORT[new URL(kibanaUrl).port];

/** Resolve where to seed: flags, then the cluster that belongs to the chosen Kibana. */
export const getConnection = async (
  flags: Record<string, unknown>,
  log: ToolingLog
): Promise<SeedConnection> => {
  const explicitKibana = flags['kibana-url'] || process.env.KIBANA_URL;
  const kibanaUrl = explicitKibana
    ? await resolveBasePath(toHttpUrl(String(explicitKibana)), log, { warn: true })
    : await discoverKibanaUrl(log);

  const cluster = clusterForKibana(kibanaUrl);
  // kibana.dev.yml carries the kibana_system credentials, which cannot write system indices.
  const username = String(
    flags['es-username'] || cluster?.username || process.env.ELASTICSEARCH_USERNAME || 'elastic'
  );
  const password = String(flags['es-password'] || process.env.ELASTICSEARCH_PASSWORD || 'changeme');

  const fallbackEs = process.env.ELASTICSEARCH_HOST || readDevEsUrl();
  const esUrl = flags['es-url']
    ? toHttpUrl(String(flags['es-url']))
    : cluster?.esUrl ?? (fallbackEs ? toHttpUrl(String(fallbackEs)) : undefined);
  if (!esUrl) {
    throw new Error('Pass --es-url or set elasticsearch.hosts in config/kibana.dev.yml.');
  }

  return { esUrl, kibanaUrl, username, password };
};
