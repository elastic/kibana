/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, RequestHandlerContext } from 'src/core/server';

export class WithRequest {
  public readonly callCluster: APICaller;

  constructor(readonly context: RequestHandlerContext) {
    // @ts-ignore
    // const securityPlugin = req.server.plugins.security;
    // if (securityPlugin) {
    //   const useRbac = securityPlugin.authorization.mode.useRbacForRequest(req);
    //   if (useRbac) {
    //     this.callCluster = cluster.callWithInternalUser;
    //     return;
    //   }
    // }
    this.callCluster = context.core.elasticsearch.dataClient.callAsInternalUser;
  }
}
