/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec, Query } from '@kbn/data-plugin/common';
import { Filter } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import { MapCenter, MapSettings } from '../../../../common/descriptor_types';

export interface RefreshConfig {
  isPaused: boolean;
  interval: number;
}

// parsed contents of mapStateJSON
export interface ParsedMapStateJSON {
  adHocDataViews?: DataViewSpec[];
  zoom: number;
  center: MapCenter;
  timeFilters?: TimeRange;
  refreshConfig: RefreshConfig;
  query?: Query;
  filters: Filter[];
  settings: MapSettings;
}

// parsed contents of uiStateJSON
export interface ParsedUiStateJSON {
  isLayerTOCOpen: boolean;
  openTOCDetails: string[];
}
