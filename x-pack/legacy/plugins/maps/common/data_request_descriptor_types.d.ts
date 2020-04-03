/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Query } from './map_descriptor';

type Extent = {
  maxLat: number;
  maxLon: number;
  minLat: number;
  minLon: number;
};

// Global map state passed to every layer.
export type MapFilters = {
  buffer: Extent; // extent with additional buffer
  extent: Extent; // map viewport
  filters: unknown[];
  query: Query;
  refreshTimerLastTriggeredAt: string;
  timeFilters: unknown;
  zoom: number;
};

export type VectorSourceRequestMeta = MapFilters & {
  applyGlobalQuery: boolean;
  fieldNames: string[];
  geogridPrecision: number;
  sourceQuery: Query;
  sourceMeta: unknown;
};

export type VectorStyleRequestMeta = MapFilters & {
  dynamicStyleFields: string[];
  isTimeAware: boolean;
  sourceQuery: Query;
  timeFilters: unknown;
};

export type ESSearchSourceResponseMeta = {
  areResultsTrimmed?: boolean;
  sourceType?: string;

  // top hits meta
  areEntitiesTrimmed?: boolean;
  entityCount?: number;
  totalEntities?: number;
};

// Partial because objects are justified downstream in constructors
export type DataMeta = Partial<VectorSourceRequestMeta> &
  Partial<VectorStyleRequestMeta> &
  Partial<ESSearchSourceResponseMeta>;

export type DataRequestDescriptor = {
  dataId: string;
  dataMetaAtStart?: DataMeta;
  dataRequestToken?: symbol;
  data?: object;
  dataMeta?: DataMeta;
};
