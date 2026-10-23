/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: granular "assets to install". The install option `skip_kibana_assets` is `true`
// (no Kibana assets) or a list of assets to leave out, by saved object type + id.

import type { KibanaAssetSelector, SkipKibanaAssets } from '../types';

/**
 * The inactivity monitoring alert template Fleet creates for integration packages. Not an archive
 * asset, so it gets a fixed selector (its real id has the package name and space in it).
 */
export const INACTIVITY_MONITORING_ASSET: KibanaAssetSelector = {
  type: 'alerting_rule_template',
  id: 'fleet-inactivity-monitoring',
};

export const kibanaAssetKey = (asset: KibanaAssetSelector) => `${asset.type}:${asset.id}`;

export const isKibanaAssetSkipped = (
  skip: SkipKibanaAssets | undefined,
  asset: KibanaAssetSelector
): boolean =>
  skip === true ||
  (Array.isArray(skip) && skip.some((s) => s.type === asset.type && s.id === asset.id));
