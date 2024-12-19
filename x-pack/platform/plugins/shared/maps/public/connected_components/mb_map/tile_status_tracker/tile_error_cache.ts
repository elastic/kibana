/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MapExtent, TileError } from '../../../../common/descriptor_types';
import { getTilesForExtent } from '../../../classes/util/geo_tile_utils';

type LayerId = string;
type TileKey = string;

export function getErrorCacheTileKey(canonical: { x: number; y: number; z: number }) {
  return `${canonical.z}/${canonical.x}/${canonical.y}`;
}

export class TileErrorCache {
  private _cache: Record<LayerId, Record<TileKey, TileError>> = {};

  public clearLayer(layerId: string, onClear: () => void) {
    if (!(layerId in this._cache)) {
      return;
    }

    delete this._cache[layerId];
    onClear();
  }

  public clearTileError(layerId: string | undefined, tileKey: string, onClear: () => void) {
    if (!layerId || !(layerId in this._cache)) {
      return;
    }

    const tileErrors = this._cache[layerId];
    if (!(tileKey in tileErrors)) {
      return;
    }

    delete tileErrors[tileKey];
    this._cache[layerId] = tileErrors;
    onClear();
  }

  public hasAny() {
    return Object.keys(this._cache).some((layerId) => {
      return Object.keys(this._cache[layerId]).length;
    });
  }

  public hasTileError(layerId: string, tileKey: string) {
    return layerId in this._cache ? tileKey in this._cache[layerId] : false;
  }

  public setTileError(layerId: string, tileError: TileError) {
    const tileErrors = this._cache[layerId] ? this._cache[layerId] : {};
    tileErrors[tileError.tileKey] = tileError;
    this._cache[layerId] = tileErrors;
  }

  public getInViewTileErrors(layerId: string, zoom: number, extent: MapExtent) {
    const tileErrors = this._cache[layerId];
    if (!tileErrors) {
      return;
    }
    const tileErrorsArray = Object.values(tileErrors);
    if (!tileErrorsArray.length) {
      return;
    }

    const inViewTileKeys = getTilesForExtent(zoom, extent).map(getErrorCacheTileKey);
    const inViewTileErrors = tileErrorsArray.filter((tileError) => {
      return inViewTileKeys.includes(tileError.tileKey);
    });
    return inViewTileErrors.length ? inViewTileErrors : undefined;
  }
}
