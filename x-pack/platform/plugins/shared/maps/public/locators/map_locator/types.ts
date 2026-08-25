/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { LayerDescriptor } from '../../../common/descriptor_types';

export interface MapsAppLocatorParams extends SerializableRecord {
  /**
   * If given, it will load the given map else will load the create a new map page.
   */
  mapId?: string;

  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;

  /**
   * Optionally set the initial Layers.
   */
  initialLayers?: LayerDescriptor[] & SerializableRecord;

  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval & SerializableRecord;

  /**
   * Optionally apply filers. NOTE: if given and used in conjunction with `mapId`, and the
   * saved map has filters saved with it, this will _replace_ those filters.
   */
  filters?: Filter[];

  /**
   * Optionally set a query. NOTE: if given and used in conjunction with `mapId`, and the
   * saved map has a query saved with it, this will _replace_ that query.
   */
  query?: Query;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  hash?: boolean;

  /**
   * Optionally pass adhoc data view spec.
   */
  dataViewSpec?: DataViewSpec;
}

export type MapsAppLocator = LocatorPublic<MapsAppLocatorParams>;

export interface MapsAppLocatorDependencies {
  useHash: boolean;
}
