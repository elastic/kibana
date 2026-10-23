/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { parse } from 'yaml';
import type { ToolingLog } from '@kbn/tooling-log';

const DEFAULT_ES_URL = 'http://localhost:9200';
const API_KEY_NAME = 'kbn-mock-sandbox';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

export interface LocalEsConnection {
  /** URL reachable from the host, used to mint the API key. */
  hostUrl: string;
  /** Same cluster as seen from inside a sandbox container. */
  containerUrl: string;
  /** Value of the connector's `Authorization` header. */
  authorization: string;
}

const readConfigValue = (config: Record<string, unknown>, path: string[]): unknown => {
  // Kibana yml mixes nested and dotted keys; try every split of the path.
  for (let split = path.length; split >= 1; split--) {
    const key = path.slice(0, split).join('.');
    if (key in config) {
      const value = config[key];
      if (split === path.length) return value;
      if (value && typeof value === 'object') {
        const nested = readConfigValue(value as Record<string, unknown>, path.slice(split));
        if (nested !== undefined) return nested;
      }
    }
  }
  return undefined;
};

/** Reads the first `elasticsearch.hosts` entry from a Kibana config file, if any. */
export const readEsUrlFromKibanaConfig = (configPath: string): string | undefined => {
  if (!fs.existsSync(configPath)) return undefined;
  const config = (parse(fs.readFileSync(configPath, 'utf8')) ?? {}) as Record<string, unknown>;
  const hosts = readConfigValue(config, ['elasticsearch', 'hosts']);
  const first = Array.isArray(hosts) ? hosts[0] : hosts;
  return typeof first === 'string' ? first : undefined;
};

/** Rewrites loopback hosts to `host.docker.internal`, which resolves to the host from Docker. */
export const toContainerUrl = (url: string): string => {
  const parsed = new URL(url);
  if (LOOPBACK_HOSTS.has(parsed.hostname)) {
    parsed.hostname = 'host.docker.internal';
  }
  return parsed.toString().replace(/\/$/, '');
};

const isApiKeyValid = async (esUrl: string, authorization: string): Promise<boolean> => {
  try {
    const response = await fetch(`${esUrl}/_security/_authenticate`, {
      headers: { Authorization: authorization },
    });
    return response.ok;
  } catch {
    return false;
  }
};

const createApiKey = async (esUrl: string, username: string, password: string) => {
  const response = await fetch(`${esUrl}/_security/api_key`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: API_KEY_NAME,
      metadata: { created_by: 'node scripts/mock_sandbox.js' },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `POST /_security/api_key returned ${response.status}: ${await response.text()}`
    );
  }
  const { encoded } = (await response.json()) as { encoded: string };
  return `ApiKey ${encoded}`;
};

/**
 * Resolves the local Elasticsearch connection for the sandbox connector. Reuses the previous
 * API key while it is still valid so the generated Kibana config stays stable across restarts;
 * otherwise mints a new one. Falls back to basic auth when Elasticsearch is not reachable yet.
 */
export const resolveLocalEsConnection = async ({
  log,
  esUrl = DEFAULT_ES_URL,
  username,
  password,
  previousAuthorization,
}: {
  log: ToolingLog;
  esUrl?: string;
  username: string;
  password: string;
  previousAuthorization?: string;
}): Promise<LocalEsConnection> => {
  const hostUrl = esUrl.replace(/\/$/, '');
  const containerUrl = toContainerUrl(hostUrl);

  if (previousAuthorization && (await isApiKeyValid(hostUrl, previousAuthorization))) {
    log.info(`Reusing the existing Elasticsearch API key for ${hostUrl}`);
    return { hostUrl, containerUrl, authorization: previousAuthorization };
  }

  try {
    const authorization = await createApiKey(hostUrl, username, password);
    log.info(`Created Elasticsearch API key "${API_KEY_NAME}" on ${hostUrl}`);
    return { hostUrl, containerUrl, authorization };
  } catch (error) {
    log.warning(
      `Could not create an API key on ${hostUrl} (${
        error instanceof Error ? error.message : error
      }). Falling back to basic auth as ${username}; restart this script once Elasticsearch is up to switch to an API key.`
    );
    return {
      hostUrl,
      containerUrl,
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    };
  }
};
