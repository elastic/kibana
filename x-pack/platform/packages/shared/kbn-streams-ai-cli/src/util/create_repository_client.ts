/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { KibanaClient } from '@kbn/kibana-api-cli';
import { toHttpHandler } from '@kbn/kibana-api-cli';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';

export function createStreamsRepositoryCliClient(
  kibanaClient: KibanaClient
): StreamsRepositoryClient {
  return createRepositoryClient({
    http: {
      fetch: toHttpHandler(kibanaClient),
    },
  });
}
