/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import type { ToolingLog } from '@kbn/tooling-log';

export interface EsConfig {
  node: string;
  username: string;
  password: string;
}

const DEFAULTS: EsConfig = {
  node: 'http://localhost:9200',
  username: 'elastic',
  password: 'changeme',
};

/**
 * Reads Elasticsearch credentials the same way the rest of the dev tooling does:
 * `config/kibana.dev.yml` first, then environment variables, then defaults.
 * Deliberately local rather than borrowing `@kbn/otel-demo`'s equivalent, which is a
 * `devOnly` package this plugin should not depend on.
 */
export const readEsConfig = (log: ToolingLog, configPath?: string): EsConfig => {
  const file = resolve(process.cwd(), configPath || 'config/kibana.dev.yml');
  const config = { ...DEFAULTS };

  if (fs.existsSync(file)) {
    const loaded = (parse(fs.readFileSync(file, 'utf8')) || {}) as Record<string, unknown>;
    // Kibana config may be written either nested or with dotted keys.
    const nested = (loaded.elasticsearch ?? {}) as Record<string, unknown>;
    const hosts = loaded['elasticsearch.hosts'] ?? nested.hosts;
    const username = loaded['elasticsearch.username'] ?? nested.username;
    const password = loaded['elasticsearch.password'] ?? nested.password;

    if (hosts) config.node = Array.isArray(hosts) ? String(hosts[0]) : String(hosts);
    if (username) config.username = String(username);
    if (password) config.password = String(password);
  } else {
    log.debug(`No config at ${file}; using environment variables or defaults.`);
  }

  if (process.env.ELASTICSEARCH_HOST) config.node = process.env.ELASTICSEARCH_HOST;
  if (process.env.ELASTICSEARCH_USERNAME) config.username = process.env.ELASTICSEARCH_USERNAME;
  if (process.env.ELASTICSEARCH_PASSWORD) config.password = process.env.ELASTICSEARCH_PASSWORD;

  return config;
};
