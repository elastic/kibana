/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { AnyObject } from '../lib/esqueue';

export class WithRequest {
  public readonly callCluster: (endpoint: string, clientOptions?: AnyObject) => Promise<any>;

  constructor(readonly context: RequestHandlerContext) {
    // @ts-ignore
    // const cluster = context.elasticsearch.dataClient.callAsInternalUser;

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
