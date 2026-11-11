/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface ConnectionConfig {
  esUrl: string;
  kibanaUrl: string;
  username: string;
  password: string;
}

interface KibanaConfig {
  elasticsearch: { hosts: string };
  server: { host: string; port: number; basePath: string };
}

function readKibanaConfig(log: ToolingLog): KibanaConfig {
  const configPath = path.resolve(process.cwd(), 'config/kibana.dev.yml');

  let esValues: Record<string, unknown> = {};
  let serverValues: Record<string, unknown> = {};

  if (fs.existsSync(configPath)) {
    const loaded = (yaml.parse(fs.readFileSync(configPath, 'utf8')) || {}) as Record<
      string,
      unknown
    >;
    const esNested = (loaded.elasticsearch ?? {}) as Record<string, unknown>;
    const serverNested = (loaded.server ?? {}) as Record<string, unknown>;
    esValues = {
      hosts: loaded['elasticsearch.hosts'] ?? esNested.hosts,
    };
    serverValues = {
      host: loaded['server.host'] ?? serverNested.host,
      port: loaded['server.port'] ?? serverNested.port,
      basePath: loaded['server.basePath'] ?? serverNested.basePath,
    };
  } else {
    log.warning(`Config file not found at ${configPath}; using defaults.`);
  }

  const rawPort = serverValues.port;
  const port =
    typeof rawPort === 'number'
      ? rawPort
      : typeof rawPort === 'string'
      ? parseInt(rawPort, 10) || 5601
      : 5601;

  return {
    elasticsearch: {
      hosts: String(process.env.ELASTICSEARCH_HOST || esValues.hosts || 'http://localhost:9200'),
    },
    server: {
      host: String(process.env.KIBANA_HOST || serverValues.host || 'localhost'),
      port: process.env.KIBANA_PORT ? parseInt(process.env.KIBANA_PORT, 10) : port,
      basePath: typeof serverValues.basePath === 'string' ? serverValues.basePath : '',
    },
  };
}

async function resolveKibanaUrl(rawUrl: string, log: ToolingLog): Promise<string> {
  try {
    const response = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';
      let pathname: string;
      try {
        pathname = new URL(location).pathname;
      } catch {
        pathname = location;
      }
      if (/^\/\w{3}$/.test(pathname)) {
        const resolved = `${rawUrl}${pathname}`;
        log.debug(`Detected dev mode base path: ${pathname}, resolved URL: ${resolved}`);
        return resolved;
      }
    }
  } catch (err) {
    log.warning(
      `resolveKibanaUrl: could not probe ${rawUrl} (${
        err instanceof Error ? err.message : String(err)
      }) — using URL as-is`
    );
  }
  return rawUrl;
}

export async function getConnectionConfig(
  flags: Record<string, unknown>,
  log: ToolingLog
): Promise<ConnectionConfig> {
  const { elasticsearch, server: serverConfig } = readKibanaConfig(log);

  const esUrl = String(flags['es-url'] || elasticsearch.hosts);
  const username = String(flags['es-username'] || 'elastic');
  const password = String(flags['es-password'] || 'changeme');

  const rawKibanaUrl = flags['kibana-url']
    ? String(flags['kibana-url'])
    : `http://${serverConfig.host}:${serverConfig.port}${serverConfig.basePath}`;
  const kibanaUrl = await resolveKibanaUrl(rawKibanaUrl, log);

  return { esUrl, kibanaUrl, username, password };
}
