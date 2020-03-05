/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AbstractSource, ISource } from './source';
import { IField } from '../fields/field';

export type GeoJsonFetchMeta = {
  areResultsTrimmed: boolean;
  areEntitiesTrimmed?: boolean;
  entityCount?: number;
  totalEntities?: number;
};

export type GeoJsonWithMeta = {
  data: unknown; // geojson feature collection
  meta?: GeoJsonFetchMeta;
};

export interface IVectorSource extends ISource {
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
}

export class AbstractVectorSource extends AbstractSource {
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
}
