/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType } from 'utility-types';
import type { StreamQuery } from '@kbn/streams-schema';

export const ASSET_TYPES = {
  Query: 'query' as const,
};

export type AssetType = ValuesType<typeof ASSET_TYPES>;

interface AssetLinkBase<TAssetType extends AssetType = AssetType> {
  'asset.uuid': string;
  'asset.type': TAssetType;
  'asset.id': string;
}

export type QueryLink = AssetLinkBase<'query'> & {
  query: StreamQuery;
};

export type AssetLink = QueryLink;

export function isQueryLink(item: AssetLink): item is QueryLink {
  return item['asset.type'] === 'query';
}

type OmitFrom<T, K> = T extends any ? (K extends keyof T ? Omit<T, K> : never) : never;

export type AssetLinkRequest = OmitFrom<AssetLink, 'asset.uuid'>;

export type AssetUnlinkRequest = Pick<AssetLink, 'asset.type' | 'asset.id'>;

interface AssetBase<TAssetType extends AssetType> extends AssetLinkBase<TAssetType> {
  title: string;
}

export type QueryAsset = AssetBase<'query'> & {
  query: StreamQuery;
};

export type Asset = QueryAsset;
export type AssetWithoutUuid = Omit<AssetLink, 'asset.uuid'>;

export interface AssetTypeToAssetMap {
  [ASSET_TYPES.Query]: QueryAsset;
}
