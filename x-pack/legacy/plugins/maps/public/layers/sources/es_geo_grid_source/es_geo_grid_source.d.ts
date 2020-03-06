/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractESAggSource } from '../es_agg_source';
import { ESGeoGridSourceDescriptor } from '../../../../common/descriptor_types';
import { IESAggField } from '../../fields/es_agg_field';

export class ESGeoGridSource extends AbstractESAggSource {
  constructor(sourceDescriptor: ESGeoGridSourceDescriptor, inspectorAdapters: unknown);
  getMetricFields(): IESAggField[];
}
