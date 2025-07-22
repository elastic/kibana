/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';
import { StreamQuery } from '@kbn/streams-schema';

export const ASSET_TYPES = {
  Dashboard: 'dashboard' as const,
  Rule: 'rule' as const,
  Slo: 'slo' as const,
  Query: 'query' as const,
};

export type AssetType = ValuesType<typeof ASSET_TYPES>;

interface AssetLinkBase<TAssetType extends AssetType = AssetType> {
  'asset.uuid': string;
  'asset.type': TAssetType;
  'asset.id': string;
}

export type DashboardLink = AssetLinkBase<'dashboard'>;
export type SloLink = AssetLinkBase<'slo'>;
export type RuleLink = AssetLinkBase<'rule'>;
export type QueryLink = AssetLinkBase<'query'> & {
  query: StreamQuery;
};

export type AssetLink = DashboardLink | SloLink | RuleLink | QueryLink;

export function isQueryLink(item: AssetLink): item is QueryLink {
  return item['asset.type'] === 'query';
}

type OmitFrom<T, K> = T extends any ? (K extends keyof T ? Omit<T, K> : never) : never;

export type AssetLinkRequest = OmitFrom<AssetLink, 'asset.uuid'>;

export type AssetUnlinkRequest = Pick<AssetLink, 'asset.type' | 'asset.id'>;

interface AssetBase<TAssetType extends AssetType> extends AssetLinkBase<TAssetType> {
  title: string;
}

interface SavedObjectAssetBase<TAssetType extends AssetType = AssetType>
  extends AssetBase<TAssetType> {
  tags: string[];
}

export type DashboardAsset = SavedObjectAssetBase<'dashboard'>;
export type SloAsset = SavedObjectAssetBase<'slo'>;
export type RuleAsset = SavedObjectAssetBase<'rule'>;
export type QueryAsset = AssetBase<'query'> & {
  query: StreamQuery;
};

export type Asset = DashboardAsset | SloAsset | RuleAsset | QueryAsset;
export type AssetWithoutUuid = Omit<AssetLink, 'asset.uuid'>;

export interface AssetTypeToAssetMap {
  [ASSET_TYPES.Dashboard]: DashboardAsset;
  [ASSET_TYPES.Slo]: SloAsset;
  [ASSET_TYPES.Rule]: RuleAsset;
  [ASSET_TYPES.Query]: QueryAsset;
}
