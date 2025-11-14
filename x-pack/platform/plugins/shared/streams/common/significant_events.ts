/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/streams-schema';

export const QUERY_ASSET_TYPE = 'query';

interface AssetLinkBase {
  'asset.uuid': string;
  'asset.type': typeof QUERY_ASSET_TYPE;
  'asset.id': string;
}

export type SignificantEventLink = AssetLinkBase & {
  query: StreamQuery;
};

type OmitFrom<T, K> = T extends any ? (K extends keyof T ? Omit<T, K> : never) : never;

export type SignificantEventLinkRequest = OmitFrom<SignificantEventLink, 'asset.uuid'>;

export type SignificantEventLinkUnlinkRequest = Pick<
  SignificantEventLink,
  'asset.type' | 'asset.id'
>;

export type SignificantEvent = AssetLinkBase & {
  title: string;
  query: StreamQuery;
};
