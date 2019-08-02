/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { Endpoint } from './resource_locator';
import { RequestContext } from './service_definition';

export class LocalEndpoint implements Endpoint {
  constructor(readonly httpRequest: Request, readonly resource: string) {}

  toContext(): RequestContext {
    return {
      resource: this.resource,
      path: this.httpRequest.path,
    } as RequestContext;
  }
}
