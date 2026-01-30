/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { set } from '@kbn/safer-lodash-set';
import type { Root } from '@kbn/core-root-server-internal';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';
import type { ToolingLog } from '@kbn/tooling-log';

export interface BootstrapOptions {
  esUrl?: string;
  username: string;
  password: string;
  log: ToolingLog;
  isQuiet?: boolean;
}

export interface BootstrapResult {
  root: Root;
  baseUrl: string;
}

export async function bootstrapKibana(options: BootstrapOptions): Promise<BootstrapResult> {
  const { esUrl, username, password, log, isQuiet } = options;

  const settings: Record<string, any> = {
    logging: {
      loggers: [
        {
          name: 'root',
          level: isQuiet ? 'off' : 'error',
          appenders: ['console'],
        },
      ],
    },
    server: {
      port: 0, // ephemeral port
      xsrf: { disableProtection: true },
    },
  };

  // Configure Elasticsearch connection
  if (esUrl) {
    set(settings, 'elasticsearch.hosts', [esUrl]);
  }
  set(settings, 'elasticsearch.username', username);
  set(settings, 'elasticsearch.password', password);

  // Enable all plugins including Streams
  set(settings, PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH, true);

  // Skip migrations for faster startup
  set(settings, 'migrations.skip', true);

  // Disable reporting to avoid headless browser issues
  set(settings, 'xpack.reporting.enabled', false);

  const cliArgs = {
    basePath: false,
    cache: false,
    dev: true,
    disableOptimizer: true,
    silent: isQuiet ?? false,
    dist: false,
    oss: false,
    runExamples: false,
    watch: false,
  };

  const root = createRootWithCorePlugins(settings, cliArgs);

  if (!isQuiet) {
    log.info('Starting Kibana preboot...');
  }
  await root.preboot();

  if (!isQuiet) {
    log.info('Starting Kibana setup...');
  }
  await root.setup();

  if (!isQuiet) {
    log.info('Starting Kibana...');
  }
  const { http } = await root.start();

  const serverInfo = http.getServerInfo();
  const baseUrl = `${serverInfo.protocol}://${serverInfo.hostname}:${serverInfo.port}`;

  if (!isQuiet) {
    log.success(`Kibana is running at ${baseUrl}`);
  }

  return { root, baseUrl };
}
