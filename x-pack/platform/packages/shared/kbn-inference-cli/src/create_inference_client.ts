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

class InvalidLicenseLevelError extends Error {
  constructor(license: string) {
    super(`License needs to be at least Enterprise, but was ${license}`);
  }
}

export async function createInferenceClient({
  log,
  prompt,
  signal,
  kibanaClient,
  connectorId,
}: {
  log: ToolingLog;
  prompt?: boolean;
  signal: AbortSignal;
  kibanaClient?: KibanaClient;
  connectorId?: string;
}): Promise<InferenceCliClient> {
  kibanaClient = kibanaClient || (await createKibanaClient({ log, signal }));

  const license = await kibanaClient.es.license.get();

  if (license.license.type !== 'trial' && license.license.type !== 'enterprise') {
    throw new InvalidLicenseLevelError(license.license.type);
  }

  const connector = await selectConnector({
    log,
    kibanaClient,
    prompt,
    signal,
    preferredConnectorId: connectorId,
  });

  return new InferenceCliClient({
    log,
    kibanaClient,
    connector,
    signal,
  });
}
