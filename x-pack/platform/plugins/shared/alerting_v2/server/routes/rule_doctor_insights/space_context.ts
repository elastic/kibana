/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core-http-server';
import { CoreStart, Request } from '@kbn/core-di-server';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { inject, injectable } from 'inversify';

@injectable()
export class SpaceContext {
  public readonly spaceId: string;

  constructor(
    @inject(Request) request: KibanaRequest,
    @inject(CoreStart('http')) http: HttpServiceStart
  ) {
    const basePath = http.basePath.get(request);
    this.spaceId = getSpaceIdFromPath(basePath, http.basePath.serverBasePath)?.spaceId || 'default';
  }
}
