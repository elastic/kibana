/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { ESQLColumn } from '@kbn/es-types';

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
