/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { UMBadge } from '../badge';

export interface UMFrontendLibs {
  framework: UMFrameworkAdapter;
}

export type UMUpdateBadge = (badge: UMBadge) => void;

export type UMGraphQLClient = ApolloClient<NormalizedCacheObject>; // | OtherClientType

export interface UMFrameworkAdapter {
  render(element: any): void;
}
