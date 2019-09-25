/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import { RequestContext } from './service_definition';

export interface Endpoint {
  toContext(): RequestContext;
}

export interface ResourceLocator {
  locate(req: Request, resource: string): Promise<Endpoint>;

  /**
   * Returns whether the resource resides on the local node. This should support both url and uri of the repository.
   *
   * @param resource the name of the resource.
   */
  isResourceLocal(resource: string): Promise<boolean>;

  /**
   * Allocates the resource to nodes and returns the endpoint corresponds to the allocated node.
   * If the resource cannot be allocated to any node, it returns undefined.
   */
  allocate(req: Request, resource: string): Promise<Endpoint | undefined>;
}
