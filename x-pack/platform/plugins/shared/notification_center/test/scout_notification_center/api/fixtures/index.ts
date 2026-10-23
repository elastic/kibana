/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { SYSTEM_INDICES_SUPERUSER, SYSTEM_INDICES_SUPERUSER_PASSWORD } from '@kbn/es';
import { apiTest as baseApiTest } from '@kbn/scout';
import { createEsClientForTesting } from '@kbn/test-es-server';

/**
 * A client that can seed and clean `.kibana-notifications`, which Scout's `esClient` cannot:
 * it authenticates as the configured superuser, whose `allow_restricted_indices` grant covers
 * reads only, and it sends no product origin, which Elasticsearch requires before it serves a
 * system data stream at all.
 *
 * Added alongside `esClient` rather than replacing it. Scout's own fixtures consume `esClient` —
 * `samlAuth` provisions roles with it — and silently handing those a more privileged client
 * could mask an authorization failure this suite exists to catch.
 */
export const apiTest = baseApiTest.extend<{}, { systemEsClient: Client }>({
  systemEsClient: [
    async ({ config }, use) => {
      const client = createEsClientForTesting({
        esUrl: config.hosts.elasticsearch,
        authOverride: {
          username: SYSTEM_INDICES_SUPERUSER,
          password: SYSTEM_INDICES_SUPERUSER_PASSWORD,
        },
        isCloud: config.isCloud,
        headers: { 'x-elastic-product-origin': 'kibana' },
      });
      await use(client);
      await client.close();
    },
    { scope: 'worker' },
  ],
});

export {
  INTERNAL_HEADERS,
  GET_NOTIFICATIONS_PATH,
  GET_UNREAD_STATUS_PATH,
  MARK_READ_PATH,
  MARK_ALL_READ_PATH,
  NOTIFICATION_DATA_STREAM_NAME,
} from './constants';
