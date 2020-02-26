/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractSource, ISource } from './source';
import { IField } from '../fields/field';

export interface IGeoJsonResult {
  data: unknown;
  meta: unknown;
}

export interface IVectorSource extends ISource {
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<IGeoJsonResult>;

  getFields(): Promise<IField[]>;
}

export class AbstractVectorSource extends AbstractSource implements IVectorSource {
  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<IGeoJsonResult>;

  getFields(): Promise<IField[]>;
}
