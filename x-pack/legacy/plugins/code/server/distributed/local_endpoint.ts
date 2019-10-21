/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { Endpoint } from './resource_locator';
import { RequestContext } from './service_definition';

export class LocalEndpoint implements Endpoint {
  constructor(readonly httpRequest: KibanaRequest, readonly resource: string) {}

  toContext(): RequestContext {
    return {
      resource: this.resource,
      path: this.httpRequest.route.path,
    } as RequestContext;
  }
}
