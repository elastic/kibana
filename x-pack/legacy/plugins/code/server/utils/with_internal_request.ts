/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, IClusterClient } from 'src/core/server';

export class WithInternalRequest {
  public readonly callCluster: APICaller;

  constructor(cluster: IClusterClient) {
    this.callCluster = cluster.callAsInternalUser;
  }
}
