/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { FeatureCollection } from 'geojson';
import { AbstractSource, ISource } from './source';
import { IField } from '../fields/field';
import { ESSearchSourceResponseMeta } from '../../../common/data_request_descriptor_types';

export type GeoJsonFetchMeta = ESSearchSourceResponseMeta;

export type GeoJsonWithMeta = {
  data: FeatureCollection;
  meta?: GeoJsonFetchMeta;
};

export interface IVectorSource extends ISource {
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField;
}

export class AbstractVectorSource extends AbstractSource implements IVectorSource {
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta>;

  getFields(): Promise<IField[]>;
  getFieldByName(fieldName: string): IField;
}
