/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { State, AssetType } from '../../../types';

const assetRoot = 'assets';

export function getAssets(state: State): State['assets'] {
  return get(state, assetRoot, {});
}

export function getAssetIds(state: State): Array<keyof State['assets']> {
  return Object.keys(getAssets(state));
}

export function getAssetById(state: State, id: string): AssetType | undefined {
  return state[assetRoot][id];
}
