/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Why `GET /internal/osquery/packs/_resolve_prebuilt/{assetId}` returned 404. */
export const PREBUILT_PACK_RESOLVE_REASON = {
  /** No installed asset has this id or package name. */
  unknownAsset: 'unknown_asset',
  /** The asset exists, and this space has no pack that references it. */
  notLoaded: 'not_loaded',
} as const;

export type PrebuiltPackResolveReason =
  (typeof PREBUILT_PACK_RESOLVE_REASON)[keyof typeof PREBUILT_PACK_RESOLVE_REASON];

/**
 * Why a `_prebuilt` row is not a safe picker choice. Resolve returns 409 for both.
 * Absent when the row is one space copy of one uniquely named asset.
 */
export const PREBUILT_PACK_UNAVAILABLE_REASON = {
  /** One asset, more than one pack in this space referencing it. */
  duplicateCopies: 'duplicate_copies',
  /** More than one asset uses this package name, so the name is not a stable handle. */
  duplicateAssetName: 'duplicate_asset_name',
} as const;

export type PrebuiltPackUnavailableReason =
  (typeof PREBUILT_PACK_UNAVAILABLE_REASON)[keyof typeof PREBUILT_PACK_UNAVAILABLE_REASON];

/** One prebuilt pack loaded in the current space, as returned by `_prebuilt`. */
export interface PrebuiltPackListItem {
  asset_id: string;
  /** Package-defined name, the stable handle the `osquery.runPack` step stores. */
  asset_name: string;
  /**
   * Saved-object id of one space copy. When `unavailable_reason` is set, resolve
   * returns 409 for the package name, so this id is not a pack the step will run.
   */
  pack_id: string;
  name: string;
  description?: string;
  query_count: number;
  /** How many packs in this space reference `asset_id`. */
  copies: number;
  unavailable_reason?: PrebuiltPackUnavailableReason;
}
