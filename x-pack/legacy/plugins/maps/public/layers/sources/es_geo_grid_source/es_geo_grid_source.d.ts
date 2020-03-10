/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractESAggSource } from '../es_agg_source';
import { ESGeoGridSourceDescriptor } from '../../../../common/descriptor_types';
import { GRID_RESOLUTION } from '../../../../common/constants';

export class ESGeoGridSource extends AbstractESAggSource {
  constructor(sourceDescriptor: ESGeoGridSourceDescriptor, inspectorAdapters: unknown);
  getGridResolution(): GRID_RESOLUTION;
  getGeoGridPrecision(zoom: number): number;
}
