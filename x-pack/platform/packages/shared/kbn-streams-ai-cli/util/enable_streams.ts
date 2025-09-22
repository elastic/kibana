/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaClient } from '@kbn/kibana-api-cli';
import { createStreamsRepositoryCliClient } from './create_repository_client';

export async function enableStreams({
  kibanaClient,
  signal,
}: {
  kibanaClient: KibanaClient;
  signal: AbortSignal;
}) {
  const client = createStreamsRepositoryCliClient(kibanaClient);

  await client.fetch(`POST /api/streams/_enable 2023-10-31`, {
    signal,
  });
}
