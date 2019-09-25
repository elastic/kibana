/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import { UMServerLibs } from '../lib/lib';

export interface UMContext {
  req: Request;
}

export interface UMGraphQLResolver {
  Query?: any;
}

export type CreateUMGraphQLResolvers = (libs: UMServerLibs) => any;
