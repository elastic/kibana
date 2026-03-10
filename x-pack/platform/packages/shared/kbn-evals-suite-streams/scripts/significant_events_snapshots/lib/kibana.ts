/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import type { ToolingLog } from '@kbn/tooling-log';
import { unflattenObject } from '@kbn/object-utils';
import fs from 'fs';
import yaml from 'js-yaml';
import { pickBy, identity } from 'lodash';
import { resolve } from 'path';
import type { ConnectionConfig } from './get_connection_config';

export function generateAuthHeader(config: ConnectionConfig): string {
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
}

export async function kibanaRequest(
  config: ConnectionConfig,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const response = await fetch(`${config.kibanaUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: generateAuthHeader(config),
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'create-sigevents-snapshots',
      'elastic-api-version': '2023-10-31',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);

  return { status: response.status, data };
}

interface ElasticsearchConfig {
  hosts: string;
  username: string;
  password: string;
}

interface KibanaServerConfig {
  host: string;
  port: number;
  basePath: string;
}

interface KibanaConfig {
  elasticsearch: ElasticsearchConfig;
  server: KibanaServerConfig;
}

/**
 * Reads Kibana configuration from a single config file.
 * Uses provided configPath or defaults to kibana.dev.yml.
 * Environment variables override config file values.
 */
export const readKibanaConfig = (log: ToolingLog, configPath?: string): KibanaConfig => {
  const configPathToUse = resolve(process.cwd(), configPath || 'config/kibana.dev.yml');

  let esConfigValues = {};
  let serverConfigValues = {};

  if (fs.existsSync(configPathToUse)) {
    const loaded = (yaml.load(fs.readFileSync(configPathToUse, 'utf8')) || {}) as Record<
      string,
      any
    >;
    const config = unflattenObject(loaded);
    esConfigValues = config.elasticsearch || {};
    serverConfigValues = config.server || {};
  } else {
    log.warning(
      `Config file not found at ${configPathToUse}. 
      Using environment variables or defaults for Elasticsearch credentials.`
    );
  }

  const envOverrides = pickBy(
    {
      hosts: process.env.ELASTICSEARCH_HOST,
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
    },
    identity
  );

  const elasticsearchConfig = {
    hosts: 'http://localhost:9200',
    username: 'elastic',
    password: 'changeme',
    ...esConfigValues,
    ...envOverrides,
  };

  const serverEnvOverrides = pickBy(
    {
      host: process.env.KIBANA_HOST,
      port: process.env.KIBANA_PORT ? parseInt(process.env.KIBANA_PORT, 10) : undefined,
    },
    identity
  );

  const serverConfig = {
    host: 'localhost',
    port: 5601,
    basePath: '',
    ...serverConfigValues,
    ...serverEnvOverrides,
  };

  return { elasticsearch: elasticsearchConfig, server: serverConfig };
};

/**
 * Resolves the Kibana base URL by detecting if there's a dev mode base path.
 *
 * When Kibana runs in dev mode without the `--no-base-path` flag, it uses a random
 * 3-letter base path prefix (e.g., `/abc`). This function detects that by making
 * a request to the root URL and checking the redirect location.
 *
 * @param kibanaHostname - The base Kibana URL (e.g., "http://localhost:5601")
 * @param log - Optional logger for debugging
 * @returns The Kibana URL with base path included (e.g., "http://localhost:5601/abc")
 */
export async function resolveKibanaUrl(kibanaHostname: string, log?: ToolingLog): Promise<string> {
  try {
    // Make a request to the root URL without following redirects
    const response = await fetch(kibanaHostname, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'kbn-xsrf': 'true',
      },
    });

    // Check if we got a redirect response
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '';

      // Extract the pathname from the location header
      // The location can be either a relative path ("/abc") or a full URL ("http://localhost:5601/abc")
      let pathname: string;
      try {
        // If it's a full URL, parse it and extract the pathname
        const url = new URL(location);
        pathname = url.pathname;
      } catch {
        // If parsing fails, assume it's already a relative path
        pathname = location;
      }

      // Check if it looks like a dev mode base path (3-letter pattern like /abc)
      // The pattern matches paths like "/abc" where abc is any 3 word characters
      const hasBasePath = /^\/\w{3}$/.test(pathname);

      if (hasBasePath) {
        const resolvedUrl = `${kibanaHostname}${pathname}`;
        log?.debug(`Detected dev mode base path: ${pathname}`);
        log?.debug(`Resolved Kibana URL: ${resolvedUrl}`);
        return resolvedUrl;
      }
    }

    // No base path detected or request succeeded without redirect
    log?.debug(`No dev mode base path detected, using: ${kibanaHostname}`);
    return kibanaHostname;
  } catch (error: any) {
    // If we can't connect, just return the original URL
    // The actual API call will handle the connection error
    log?.debug(
      `Could not detect base path (${error.code || error.message}), using: ${kibanaHostname}`
    );
    return kibanaHostname;
  }
}
