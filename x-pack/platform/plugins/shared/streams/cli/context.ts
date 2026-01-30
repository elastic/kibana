/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/dev-cli-runner';
import type { CliContext } from './types';

export async function extendContext(context: RunContext): Promise<CliContext> {
  const { flagsReader, log, addCleanupTask } = context;

  const esUrl = flagsReader.string('es-url');
  const kibanaUrl = flagsReader.string('kibana-url');
  const username = flagsReader.string('username') || 'elastic';
  const password = flagsReader.string('password') || 'changeme';
  const isJsonMode = flagsReader.boolean('json');

  // Dynamically import HttpClient to avoid loading heavy dependencies at module load time
  const { HttpClient } = await import('./http_client');

  // If kibana-url is provided, use external Kibana instance
  if (kibanaUrl) {
    if (!isJsonMode) {
      log.info(`Using external Kibana at ${kibanaUrl}`);
    }

    const httpClient = new HttpClient({
      baseUrl: kibanaUrl,
      username,
      password,
      log,
      isJsonMode,
    });

    return {
      httpClient,
      shutdown: async () => {},
    };
  }

  // Otherwise, bootstrap Kibana in-process
  // Dynamically import to avoid loading heavy Kibana infrastructure at module load time
  if (!isJsonMode) {
    log.info('Bootstrapping Kibana in-process...');
  }

  const { bootstrapKibana } = await import('./bootstrap');
  const { root, baseUrl } = await bootstrapKibana({
    esUrl,
    username,
    password,
    log,
    isQuiet: isJsonMode,
  });

  const httpClient = new HttpClient({
    baseUrl,
    username,
    password,
    log,
    isJsonMode,
    root,
  });

  const shutdown = async () => {
    if (!isJsonMode) {
      log.info('Shutting down Kibana...');
    }
    await root.shutdown();
  };

  addCleanupTask(shutdown);

  return {
    httpClient,
    shutdown,
  };
}
