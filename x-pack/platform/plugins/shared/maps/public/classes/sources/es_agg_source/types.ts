/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-plugin/common';
import { AGG_TYPE } from '../../../../common/constants';
import type { IESSource } from '../es_source/types';
import { IESAggField } from '../../fields/agg';

export function hasESAggSourceMethod(
  source: IESSource,
  methodName: keyof IESAggSource
): source is Pick<IESAggSource, typeof methodName> {
  return typeof (source as IESAggSource)[methodName] === 'function';
}

export interface IESAggSource extends IESSource {
  getAggKey(aggType: AGG_TYPE, fieldName: string): string;
  getAggLabel(aggType: AGG_TYPE, fieldLabel: string): Promise<string>;

  /*
   * Returns human readable name describing buckets, like "clusters" or "grids"
   */
  getBucketsName(): string;

  getMetricFields(): IESAggField[];
  getMetricFieldForName(fieldName: string): IESAggField | null;
  getValueAggsDsl(indexPattern: DataView): { [key: string]: unknown };
  isGeoGridPrecisionAware(): boolean;
  getGeoGridPrecision(zoom: number): number;
}

export interface ESAggsSourceSyncMeta {
  metrics: string[];
}
