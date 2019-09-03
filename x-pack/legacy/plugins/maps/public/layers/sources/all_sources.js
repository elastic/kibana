/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMSFileSource } from './ems_file_source';
import { GeojsonFileSource } from './client_file_source';
import { KibanaRegionmapSource } from './kibana_regionmap_source';
import { XYZTMSSource } from './xyz_tms_source';
import { EMSTMSSource } from './ems_tms_source';
import { WMSSource } from './wms_source';
import { KibanaTilemapSource } from './kibana_tilemap_source';
import { ESGeoGridSource } from './es_geo_grid_source';
import { ESSearchSource } from './es_search_source';
import { ESPewPewSource } from './es_pew_pew_source/es_pew_pew_source';

export const ALL_SOURCES = [
  GeojsonFileSource,
  ESSearchSource,
  ESGeoGridSource,
  ESPewPewSource,
  EMSFileSource,
  EMSTMSSource,
  KibanaRegionmapSource,
  KibanaTilemapSource,
  XYZTMSSource,
  WMSSource,
];
