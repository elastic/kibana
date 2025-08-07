/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { ESQLColumn } from '@kbn/es-types';
import { MVT_FIELD_TYPE } from '../constants';

export type AbstractSourceDescriptor = {
  id?: string;
  type: string;
};

export type ESQLSourceDescriptor = AbstractSourceDescriptor & {
  /*
   * Source UUID
   */
  id: string;
  esql: string;
  columns: ESQLColumn[];
  dataViewId: string;
  /*
   * Date field used to narrow ES|QL requests by global time range
   */
  dateField?: string;
  /*
   * Geo field used to narrow ES|QL requests by
   * 1. by visible map area
   * 2. spatial filters drawn on map
   */
  geoField?: string;
  narrowByGlobalSearch: boolean;
  narrowByGlobalTime: boolean;
  narrowByMapBounds: boolean;
  applyForceRefresh: boolean;
};

export type XYZTMSSourceDescriptor = AbstractSourceDescriptor & {
  urlTemplate: string;
};

export type MVTFieldDescriptor = {
  name: string;
  type: MVT_FIELD_TYPE;
};

export type TiledSingleLayerVectorSourceSettings = {
  urlTemplate: string;
  layerName: string;

  // These are the min/max zoom levels of the availability of the a particular layerName in the tileset at urlTemplate.
  // These are _not_ the visible zoom-range of the data on a map.
  // These are important so mapbox does not issue invalid requests based on the zoom level.

  // Tiled layer data cannot be displayed at lower levels of zoom than that they are stored in the tileset.
  // e.g. building footprints at level 14 cannot be displayed at level 0.
  minSourceZoom: number;
  // Tiled layer data can be displayed at higher levels of zoom than that they are stored in the tileset.
  // e.g. EMS basemap data from level 14 is at most detailed resolution and can be displayed at higher levels
  maxSourceZoom: number;

  fields: MVTFieldDescriptor[];
};

export type TiledSingleLayerVectorSourceDescriptor = AbstractSourceDescriptor &
  TiledSingleLayerVectorSourceSettings & {
    tooltipProperties: string[];
  };
