/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { AnyObject } from '../lib/esqueue';

export class WithInternalRequest {
  public readonly callCluster: (endpoint: string, clientOptions?: AnyObject) => Promise<any>;

  constructor(server: Server) {
    const cluster = server.plugins.elasticsearch.getCluster('admin');
    this.callCluster = cluster.callWithInternalUser;
  }
}
