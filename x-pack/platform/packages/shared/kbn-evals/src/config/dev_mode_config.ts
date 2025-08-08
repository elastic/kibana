/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'url';
import { discoverKibanaUrl } from '@kbn/kibana-api-cli';
import { ToolingLog } from '@kbn/tooling-log';
import type { ScoutTestConfig } from '@kbn/scout';

export async function createDevModeConfig(
  log: ToolingLog,
  baseServersConfigDir: string
): Promise<string> {
  const evalsDir = path.join(baseServersConfigDir, 'evals');
  fs.mkdirSync(evalsDir, { recursive: true });

  const kibanaBaseUrl = process.env.KIBANA_BASE_URL;

  const discoveredKibanaUrl = await discoverKibanaUrl({ baseUrl: kibanaBaseUrl, log });

  const defaultAuth = parse(discoveredKibanaUrl).auth!;

  const localConfig: Omit<ScoutTestConfig, 'license' | 'cloudUsersFilePath'> = {
    serverless: false,
    isCloud: false,
    hosts: {
      kibana: discoveredKibanaUrl,
      elasticsearch: '', // Not used in evals but required for config validation
    },
    auth: {
      username: defaultAuth.split(':')[0],
      password: defaultAuth.split(':')[1],
    },
  };
  fs.writeFileSync(path.join(evalsDir, 'local.json'), JSON.stringify(localConfig, null, 2));

  return evalsDir;
}
