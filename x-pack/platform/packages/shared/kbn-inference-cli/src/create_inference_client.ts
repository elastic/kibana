/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { KibanaClient, createKibanaClient } from '@kbn/kibana-api-cli';
import { InferenceCliClient } from './client';
import { selectConnector } from './select_connector';

export async function createInferenceClient({
  log,
  prompt,
  signal,
  kibanaClient,
}: {
  log: ToolingLog;
  prompt?: boolean;
  signal: AbortSignal;
  kibanaClient?: KibanaClient;
}): Promise<InferenceCliClient> {
  kibanaClient = kibanaClient || (await createKibanaClient({ log, signal }));

  const connector = await selectConnector({ log, kibanaClient, prompt });

  return new InferenceCliClient({
    log,
    kibanaClient,
    connectorId: connector.connectorId,
    signal,
  });
}
