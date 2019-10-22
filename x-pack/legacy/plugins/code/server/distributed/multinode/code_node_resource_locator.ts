/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { Endpoint, ResourceLocator } from '../resource_locator';
import { CodeNodeEndpoint } from './code_node_endpoint';

export class CodeNodeResourceLocator implements ResourceLocator {
  constructor(private readonly codeNodeUrl: string) {}

  async locate(httpRequest: KibanaRequest, resource: string): Promise<Endpoint> {
    return Promise.resolve(new CodeNodeEndpoint(httpRequest, resource, this.codeNodeUrl));
  }

  isResourceLocal(resource: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  allocate(req: KibanaRequest, resource: string): Promise<Endpoint | undefined> {
    return this.locate(req, resource);
  }
}
