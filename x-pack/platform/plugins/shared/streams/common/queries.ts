/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/streams-schema';

export const QUERY_STATUSES = ['active', 'draft'] as const;
export type QueryStatus = (typeof QUERY_STATUSES)[number];

export interface QueryLink {
  'asset.uuid': string;
  'asset.type': 'query';
  'asset.id': string;
  query: StreamQuery;
  stream_name: string;
  /** Whether a Kibana rule exists for this query. */
  rule_backed: boolean;
  /** The deterministic ID of the Kibana rule associated with this query. */
  rule_id: string;
}

export type QueryLinkRequest = Omit<QueryLink, 'asset.uuid' | 'stream_name'>;

export type QueryUnlinkRequest = Pick<QueryLink, 'asset.type' | 'asset.id'>;

export type Query = QueryLink & {
  title: string;
};
