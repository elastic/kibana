/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { LocalEndpoint } from '../local_endpoint';

export class CodeNodeEndpoint extends LocalEndpoint {
  constructor(
    public readonly httpRequest: KibanaRequest,
    public readonly resource: string,
    public readonly codeNodeUrl: string
  ) {
    super(httpRequest, resource);
  }
}
