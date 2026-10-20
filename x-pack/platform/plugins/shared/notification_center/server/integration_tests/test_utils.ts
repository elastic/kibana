/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * Elasticsearch reserves `.kibana-notifications` for Kibana: it is an ES system data stream
 * whose descriptor only admits requests carrying Kibana's product origin. Kibana's own clients
 * send the header by default; the test cluster client does not.
 */
export const asKibanaClient = (client: Client): Client =>
  client.child({ headers: { 'x-elastic-product-origin': 'kibana' } });
