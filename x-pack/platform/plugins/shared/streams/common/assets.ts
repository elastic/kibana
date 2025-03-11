/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValuesType } from 'utility-types';

export const ASSET_TYPES = {
  Dashboard: 'dashboard' as const,
  Rule: 'rule' as const,
  Slo: 'slo' as const,
};

export type AssetType = ValuesType<typeof ASSET_TYPES>;

export interface AssetLink<TAssetType extends AssetType = AssetType> {
  assetType: TAssetType;
  assetId: string;
}

export type DashboardLink = AssetLink<'dashboard'>;
export type SloLink = AssetLink<'slo'>;
export type RuleLink = AssetLink<'rule'>;

export interface Asset<TAssetType extends AssetType = AssetType> extends AssetLink<TAssetType> {
  label: string;
  tags: string[];
}

export type DashboardAsset = Asset<'dashboard'>;
export type SloAsset = Asset<'slo'>;
export type RuleAsset = Asset<'rule'>;

export interface AssetTypeToAssetMap {
  [ASSET_TYPES.Dashboard]: DashboardAsset;
  [ASSET_TYPES.Slo]: SloAsset;
  [ASSET_TYPES.Rule]: RuleAsset;
}
