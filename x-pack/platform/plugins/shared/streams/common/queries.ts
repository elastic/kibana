/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/streams-schema';

export interface QueryLink {
  'asset.uuid': string;
  'asset.type': 'query';
  'asset.id': string;
  query: StreamQuery;
}

type OmitFrom<T, K> = T extends any ? (K extends keyof T ? Omit<T, K> : never) : never;

export type QueryLinkRequest = OmitFrom<QueryLink, 'asset.uuid'>;

export type QueryUnlinkRequest = Pick<QueryLink, 'asset.type' | 'asset.id'>;

export type Query = QueryLink & {
  title: string;
  query: StreamQuery;
};
