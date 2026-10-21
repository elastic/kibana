/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';

/**
 * A client that can reach `.kibana-notifications`.
 *
 * `RestController` marks every REST request without `x-elastic-product-origin` as barred from
 * system index access, so the cluster refuses the stream outright. Core's client sends the header
 * on every request, which is why the plugin never sets it — a test double standing in for that
 * client has to send it too.
 */
export const createNotificationEsClient = (node: string): Client =>
  new Client({
    node,
    Connection: HttpConnection,
    requestTimeout: 30_000,
    headers: { 'x-elastic-product-origin': 'kibana' },
  });
