/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error
import turfCenterOfMass from '@turf/center-of-mass';
import { EventEmitter } from 'events';
import { LAT_INDEX, LON_INDEX } from '../../../common/constants';
import type { TileError, TileMetaFeature } from '../../../common/descriptor_types';
import { TileRequest } from './types';
import { isPointInTile } from '../../classes/util/geo_tile_utils';

interface LayerState {
  label: string;
  tileErrors?: TileError[];
  tileMetaFeatures?: TileMetaFeature[];
  tileUrl: string;
}

export class VectorTileAdapter extends EventEmitter {
  private _layers: Record<string, LayerState> = {};
  private _tiles: Array<{ x: number; y: number; z: number }> = [];

  public addLayer(layerId: string, label: string, tileUrl: string) {
    this._layers[layerId] = { label, tileUrl };
    this._onChange();
  }

  public removeLayer(layerId: string) {
    delete this._layers[layerId];
    this._onChange();
  }

  public hasLayers() {
    return Object.keys(this._layers).length > 0;
  }

  public setTiles(tiles: Array<{ x: number; y: number; z: number }>) {
    this._tiles = tiles;
    this._onChange();
  }

  public setTileResults(
    layerId: string,
    tileMetaFeatures?: TileMetaFeature[],
    tileErrors?: TileError[]
  ) {
    if (!this._layers[layerId]) {
      return;
    }

    this._layers[layerId] = {
      ...this._layers[layerId],
      tileErrors,
      tileMetaFeatures,
    };
    this._onChange();
  }

  public getLayerOptions(): Array<{ value: string; label: string }> {
    return Object.keys(this._layers).map((layerId) => {
      return {
        value: layerId,
        label: this._layers[layerId].label,
      };
    });
  }

  public getTileRequests(layerId: string): TileRequest[] {
    if (!this._layers[layerId]) {
      return [];
    }

    const { tileErrors, tileMetaFeatures, tileUrl } = this._layers[layerId];
    return this._tiles.map((tile) => {
      return {
        layerId,
        tileUrl,
        tileError: getTileError(tile.x, tile.y, tile.z, tileErrors),
        tileMetaFeature: getTileMetaFeature(tile.x, tile.y, tile.z, tileMetaFeatures),
        ...tile,
      };
    });
  }

  private _onChange() {
    this.emit('change');
  }
}

export function getTileMetaFeature(
  x: number,
  y: number,
  z: number,
  tileMetaFeatures?: TileMetaFeature[]
) {
  if (!tileMetaFeatures || tileMetaFeatures.length === 0) {
    return;
  }

  return tileMetaFeatures.find((tileMetaFeature) => {
    const centerGeometry = turfCenterOfMass(tileMetaFeature).geometry;
    return isPointInTile(
      centerGeometry.coordinates[LAT_INDEX],
      centerGeometry.coordinates[LON_INDEX],
      x,
      y,
      z
    );
  });
}

export function getTileError(x: number, y: number, z: number, tileErrors?: TileError[]) {
  if (!tileErrors || tileErrors.length === 0) {
    return;
  }

  const tileKey = `${z}/${x}/${y}`;

  return tileErrors.find((tileError) => {
    return tileError.tileKey === tileKey;
  });
}
