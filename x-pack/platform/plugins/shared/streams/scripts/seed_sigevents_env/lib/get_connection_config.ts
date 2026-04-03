/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface ConnectionConfig {
  esUrl: string;
  kibanaUrl: string;
  username: string;
  password: string;
}

/** Supports both nested YAML and flat `elasticsearch.*` / `server.*` keys from kibana.dev.yml. */
function readKibanaDevYml(log: ToolingLog): {
  elasticsearch?: {
    hosts?: string | string[];
    username?: string;
    password?: string;
  };
  server?: {
    host?: string;
    port?: number;
    basePath?: string;
  };
} {
  const configPath = path.join(process.env.KIBANA_DIR ?? process.cwd(), 'config', 'kibana.dev.yml');

  if (!fs.existsSync(configPath)) {
    log.warning(`Config file not found at ${configPath}; using CLI flags or defaults.`);
    return {};
  }

  const loaded = (yaml.load(fs.readFileSync(configPath, 'utf8')) || {}) as Record<string, unknown>;

  const esNested = loaded.elasticsearch as
    | { hosts?: string | string[]; username?: string; password?: string }
    | undefined;
  const serverNested = loaded.server as
    | { host?: string; port?: number | string; basePath?: string }
    | undefined;

  const rawPort = loaded['server.port'] ?? serverNested?.port;
  let port: number | undefined;
  if (typeof rawPort === 'number') {
    port = rawPort;
  } else if (typeof rawPort === 'string') {
    const parsed = parseInt(rawPort, 10);
    if (Number.isNaN(parsed)) {
      log.warning(`Config: server.port "${rawPort}" is not a valid number; falling back to 5601.`);
    } else {
      port = parsed;
    }
  }

  return {
    elasticsearch: {
      hosts: (loaded['elasticsearch.hosts'] as string | string[] | undefined) ?? esNested?.hosts,
      username: (loaded['elasticsearch.username'] as string | undefined) ?? esNested?.username,
      password: (loaded['elasticsearch.password'] as string | undefined) ?? esNested?.password,
    },
    server: {
      host: (loaded['server.host'] as string | undefined) ?? serverNested?.host,
      port,
      basePath: (loaded['server.basePath'] as string | undefined) ?? serverNested?.basePath,
    },
  };
}

function firstEsHost(hosts: string | string[] | undefined): string {
  if (Array.isArray(hosts)) {
    return String(hosts[0] ?? 'http://localhost:9200');
  }
  if (typeof hosts === 'string') {
    return hosts;
  }
  return 'http://localhost:9200';
}

export async function getConnectionConfig(
  flags: Record<string, unknown>,
  log: ToolingLog
): Promise<ConnectionConfig> {
  const fromFile = readKibanaDevYml(log);
  const elasticsearch = fromFile.elasticsearch ?? {};

  const esUrl = String(flags['es-url'] ?? firstEsHost(elasticsearch.hosts));
  const username = String(flags['es-username'] ?? elasticsearch.username ?? 'elastic');
  const password = String(flags['es-password'] ?? elasticsearch.password ?? 'changeme');

  const server = fromFile.server ?? {};
  const host = String(server.host ?? 'localhost');
  const port = typeof server.port === 'number' && Number.isFinite(server.port) ? server.port : 5601;
  const basePath = typeof server.basePath === 'string' ? server.basePath : '';

  let kibanaUrl: string;
  if (flags['kibana-url']) {
    kibanaUrl = String(flags['kibana-url']);
  } else {
    kibanaUrl = `http://${host}:${port}${basePath}`;
    log.debug(`Kibana URL from kibana.dev.yml: ${kibanaUrl}`);
  }

  return { esUrl, kibanaUrl, username, password };
}
