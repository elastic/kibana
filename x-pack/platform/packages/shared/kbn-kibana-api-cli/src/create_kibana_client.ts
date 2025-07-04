/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { discoverKibanaUrl } from './discover_kibana_url';
import { KibanaClient } from './client';

export async function createKibanaClient({
  log,
  signal,
}: {
  log: ToolingLog;
  signal: AbortSignal;
}) {
  const baseUrl = await discoverKibanaUrl({
    log,
  });
  return new KibanaClient({ baseUrl, signal });
}
