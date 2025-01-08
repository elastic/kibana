/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_EMS_DARKMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_ROADMAP_ID,
} from '@kbn/maps-ems-plugin/common';
import { GRID_RESOLUTION, LAYER_TYPE, RENDER_AS, SCALING_TYPES, SOURCE_TYPES } from '../constants';
import {
  EMSTMSSourceDescriptor,
  EMSFileSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
  JoinDescriptor,
  VectorLayerDescriptor,
} from '../descriptor_types';
import type { MapAttributes } from '../content_management';
import { EMS_BASEMAP_KEYS, JOIN_KEYS, LAYER_KEYS, RESOLUTION_KEYS, SCALING_KEYS } from './types';

export class LayerStatsCollector {
  private _layerCount = 0;

  private _basemapCounts: { [key in EMS_BASEMAP_KEYS]?: number } = {};
  private _joinCounts: { [key in JOIN_KEYS]?: number } = {};
  private _layerCounts: { [key in LAYER_KEYS]?: number } = {};
  private _resolutionCounts: { [key in RESOLUTION_KEYS]?: number } = {};
  private _scalingCounts: { [key in SCALING_KEYS]?: number } = {};
  private _emsFileCounts: { [key: string]: number } = {};
  private _layerTypeCounts: { [key: string]: number } = {};
  private _sourceIds: Set<string> = new Set();

  constructor(attributes: MapAttributes) {
    if (!attributes || !attributes.layerListJSON) {
      return;
    }

    let layerList: LayerDescriptor[] = [];
    try {
      layerList = JSON.parse(attributes.layerListJSON);
    } catch (e) {
      return;
    }

    this._layerCount = layerList.length;
    layerList.forEach((layerDescriptor) => {
      this._updateCounts(getBasemapKey(layerDescriptor), this._basemapCounts);
      const joins = (layerDescriptor as VectorLayerDescriptor)?.joins;
      if (joins && joins.length) {
        joins.forEach((joinDescriptor) => {
          this._updateCounts(getJoinKey(joinDescriptor), this._joinCounts);
        });
      }
      this._updateCounts(getLayerKey(layerDescriptor), this._layerCounts);
      this._updateCounts(getResolutionKey(layerDescriptor), this._resolutionCounts);
      this._updateCounts(getScalingKey(layerDescriptor), this._scalingCounts);
      this._updateCounts(getEmsFileId(layerDescriptor), this._emsFileCounts);
      if (layerDescriptor.type) {
        this._updateCounts(layerDescriptor.type, this._layerTypeCounts);
      }
      if (layerDescriptor.sourceDescriptor?.id) {
        this._sourceIds.add(layerDescriptor.sourceDescriptor.id);
      }
    });
  }

  getLayerCount() {
    return this._layerCount;
  }

  getBasemapCounts() {
    return this._basemapCounts;
  }

  getJoinCounts() {
    return this._joinCounts;
  }

  getLayerCounts() {
    return this._layerCounts;
  }

  getResolutionCounts() {
    return this._resolutionCounts;
  }

  getScalingCounts() {
    return this._scalingCounts;
  }

  getEmsFileCounts() {
    return this._emsFileCounts;
  }

  getLayerTypeCounts() {
    return this._layerTypeCounts;
  }

  getSourceCount() {
    return this._sourceIds.size;
  }

  _updateCounts(key: string | null, counts: { [key: string]: number }) {
    if (key) {
      if (key in counts) {
        counts[key] += 1;
      } else {
        counts[key] = 1;
      }
    }
  }
}

function getEmsFileId(layerDescriptor: LayerDescriptor): string | null {
  return layerDescriptor.sourceDescriptor !== null &&
    layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_FILE &&
    'id' in layerDescriptor.sourceDescriptor
    ? (layerDescriptor.sourceDescriptor as EMSFileSourceDescriptor).id
    : null;
}

function getBasemapKey(layerDescriptor: LayerDescriptor): EMS_BASEMAP_KEYS | null {
  if (
    !layerDescriptor.sourceDescriptor ||
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.EMS_TMS
  ) {
    return null;
  }

  const descriptor = layerDescriptor.sourceDescriptor as EMSTMSSourceDescriptor;

  if (descriptor.isAutoSelect) {
    return EMS_BASEMAP_KEYS.AUTO;
  }

  if (descriptor.id === DEFAULT_EMS_ROADMAP_ID) {
    return EMS_BASEMAP_KEYS.ROADMAP;
  }

  if (descriptor.id === DEFAULT_EMS_ROADMAP_DESATURATED_ID) {
    return EMS_BASEMAP_KEYS.ROADMAP_DESATURATED;
  }

  if (descriptor.id === DEFAULT_EMS_DARKMAP_ID) {
    return EMS_BASEMAP_KEYS.DARK;
  }

  return null;
}

function getJoinKey(joinDescriptor: Partial<JoinDescriptor>): JOIN_KEYS | null {
  if (joinDescriptor?.right?.type === SOURCE_TYPES.ES_TERM_SOURCE) {
    return JOIN_KEYS.TERM;
  }

  if (joinDescriptor?.right?.type === SOURCE_TYPES.ES_DISTANCE_SOURCE) {
    return JOIN_KEYS.DISTANCE;
  }

  return null;
}

function getLayerKey(layerDescriptor: LayerDescriptor): LAYER_KEYS | null {
  if (layerDescriptor.type === LAYER_TYPE.HEATMAP) {
    return LAYER_KEYS.ES_AGG_HEATMAP;
  }

  if (layerDescriptor.type === LAYER_TYPE.LAYER_GROUP) {
    return LAYER_KEYS.LAYER_GROUP;
  }

  if (!layerDescriptor.sourceDescriptor) {
    return null;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_FILE) {
    return LAYER_KEYS.EMS_REGION;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_TMS) {
    return LAYER_KEYS.EMS_BASEMAP;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.KIBANA_TILEMAP) {
    return LAYER_KEYS.KBN_TMS_RASTER;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.EMS_XYZ) {
    return LAYER_KEYS.UX_TMS_RASTER;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.WMS) {
    return LAYER_KEYS.UX_WMS;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.MVT_SINGLE_LAYER) {
    return LAYER_KEYS.UX_TMS_MVT;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_GEO_LINE) {
    return LAYER_KEYS.ES_TRACKS;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_PEW_PEW) {
    return LAYER_KEYS.ES_POINT_TO_POINT;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_ML_ANOMALIES) {
    return LAYER_KEYS.ES_ML_ANOMALIES;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ESQL) {
    return LAYER_KEYS.ESQL;
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_SEARCH) {
    const sourceDescriptor = layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor;

    if (sourceDescriptor.scalingType === SCALING_TYPES.TOP_HITS) {
      return LAYER_KEYS.ES_TOP_HITS;
    } else {
      return LAYER_KEYS.ES_DOCS;
    }
  }

  if (layerDescriptor.sourceDescriptor.type === SOURCE_TYPES.ES_GEO_GRID) {
    const sourceDescriptor = layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor;
    if (sourceDescriptor.requestType === RENDER_AS.POINT) {
      return LAYER_KEYS.ES_AGG_CLUSTERS;
    } else if (sourceDescriptor.requestType === RENDER_AS.GRID) {
      return LAYER_KEYS.ES_AGG_GRIDS;
    } else if (sourceDescriptor.requestType === RENDER_AS.HEX) {
      return LAYER_KEYS.ES_AGG_HEXAGONS;
    }
  }

  return null;
}

function getResolutionKey(layerDescriptor: LayerDescriptor): RESOLUTION_KEYS | null {
  if (
    !layerDescriptor.sourceDescriptor ||
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.ES_GEO_GRID ||
    !(layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor).resolution
  ) {
    return null;
  }

  const descriptor = layerDescriptor.sourceDescriptor as ESGeoGridSourceDescriptor;

  if (descriptor.resolution === GRID_RESOLUTION.COARSE) {
    return RESOLUTION_KEYS.COARSE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.FINE) {
    return RESOLUTION_KEYS.FINE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
    return RESOLUTION_KEYS.MOST_FINE;
  }

  if (descriptor.resolution === GRID_RESOLUTION.SUPER_FINE) {
    return RESOLUTION_KEYS.SUPER_FINE;
  }

  return null;
}

function getScalingKey(layerDescriptor: LayerDescriptor): SCALING_KEYS | null {
  if (
    !layerDescriptor.sourceDescriptor ||
    layerDescriptor.sourceDescriptor.type !== SOURCE_TYPES.ES_SEARCH ||
    !(layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor).scalingType
  ) {
    return null;
  }

  const descriptor = layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor;

  if (descriptor.scalingType === SCALING_TYPES.CLUSTERS) {
    return SCALING_KEYS.CLUSTERS;
  }

  if (descriptor.scalingType === SCALING_TYPES.MVT) {
    return SCALING_KEYS.MVT;
  }

  if (descriptor.scalingType === SCALING_TYPES.LIMIT) {
    return SCALING_KEYS.LIMIT;
  }

  return null;
}
