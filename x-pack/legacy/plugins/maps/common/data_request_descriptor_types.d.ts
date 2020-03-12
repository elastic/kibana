/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

// Global map state passed to every layer.
export type MapFilters = {
  buffer: unknown;
  extent: unknown;
  filters: unknown[];
  query: unknown;
  refreshTimerLastTriggeredAt: string;
  timeFilters: unknown;
  zoom: number;
};

export type VectorLayerRequestMeta = MapFilters & {
  applyGlobalQuery: boolean;
  fieldNames: string[];
  geogridPrecision: number;
  sourceQuery: unknown;
  sourceMeta: unknown;
};

export type ESSearchSourceResponseMeta = {
  areResultsTrimmed?: boolean;
  sourceType?: string;

  // top hits meta
  areEntitiesTrimmed?: boolean;
  entityCount?: number;
  totalEntities?: number;
};

export type DataMeta = Partial<VectorLayerRequestMeta> & Partial<ESSearchSourceResponseMeta>;

export type DataRequestDescriptor = {
  dataId: string;
  dataMetaAtStart?: DataMeta;
  dataRequestToken?: symbol;
  data?: object;
  dataMeta?: DataMeta;
};
