/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { readKibanaConfig, resolveKibanaUrl } from './kibana';

export interface ConnectionConfig {
  esUrl: string;
  kibanaUrl: string;
  username: string;
  password: string;
}

export async function getConnectionConfig(
  flags: Record<string, unknown>,
  log: ToolingLog
): Promise<ConnectionConfig> {
  const kibanaConfig = readKibanaConfig(log);
  const { elasticsearch, server: serverConfig } = kibanaConfig;

  const esUrl = String(
    flags['es-url'] ||
      (Array.isArray(elasticsearch.hosts) ? elasticsearch.hosts[0] : elasticsearch.hosts)
  );
  const username = String(flags['es-username'] || elasticsearch.username);
  const password = String(flags['es-password'] || elasticsearch.password);

  let kibanaUrl: string;
  if (flags['kibana-url']) {
    kibanaUrl = String(flags['kibana-url']);
  } else {
    const rawUrl = `http://${serverConfig.host}:${serverConfig.port}${serverConfig.basePath}`;
    log.debug(
      `Kibana config — host: ${serverConfig.host}, port: ${serverConfig.port}, basePath: "${serverConfig.basePath}", raw URL: ${rawUrl}`
    );

    kibanaUrl = await resolveKibanaUrl(rawUrl, log);
  }

  return { esUrl, kibanaUrl, username, password };
}
