/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import { LocalEndpoint } from '../local_endpoint';
import { CodeNode } from './code_nodes';

export class ClusterNodeEndpoint extends LocalEndpoint {
  constructor(
    public readonly httpRequest: Request,
    public readonly resource: string,
    public readonly codeNode: CodeNode
  ) {
    super(httpRequest, resource);
  }
}
