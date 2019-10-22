/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, KibanaRequest, RequestHandlerContext } from 'src/core/server';

export class WithRequest {
  public readonly callCluster: APICaller;

  constructor(public readonly context: RequestHandlerContext, public readonly req: KibanaRequest) {
    const securityPlugin = context.code.legacy.securityPlugin;
    const useRbac =
      securityPlugin &&
      securityPlugin.authorization &&
      // @ts-ignore
      securityPlugin.authorization.mode.useRbacForRequest(req);
    this.callCluster = useRbac
      ? context.core.elasticsearch.dataClient.callAsInternalUser
      : context.core.elasticsearch.dataClient.callAsCurrentUser;
  }
}
