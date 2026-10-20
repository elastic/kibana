/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { apiTest as baseApiTest } from '@kbn/scout';
import { createSystemIndicesEsClient } from './system_indices_es_client';

export {
  INTERNAL_HEADERS,
  GET_NOTIFICATIONS_PATH,
  GET_UNREAD_STATUS_PATH,
  MARK_READ_PATH,
  MARK_ALL_READ_PATH,
  NOTIFICATION_DATA_STREAM_NAME,
} from './constants';

export interface NotificationCenterWorkerFixtures {
  /**
   * An ES client that can seed and clear `.kibana-notifications` directly. Elasticsearch
   * registers the stream as a system data stream reserved for Kibana, so a test client needs
   * both restricted-index privileges and Kibana's product-origin header to touch it.
   */
  notificationsEsClient: Client;
}

export const apiTest = baseApiTest.extend<{}, NotificationCenterWorkerFixtures>({
  notificationsEsClient: [
    async ({ esClient, config }, use) => {
      const systemIndicesClient = await createSystemIndicesEsClient(esClient, config);
      await use(systemIndicesClient.child({ headers: { 'x-elastic-product-origin': 'kibana' } }));
    },
    { scope: 'worker' },
  ],
});
