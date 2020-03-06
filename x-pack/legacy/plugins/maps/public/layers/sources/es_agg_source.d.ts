/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IESSource } from './es_source';
import { AbstractESSource } from './es_source';
import { AGG_TYPE } from '../../../common/constants';
import { IESAggField } from '../fields/es_agg_field';

export interface IESAggSource extends IESSource {
  getAggKey(aggType: AGG_TYPE, fieldName: string): string;
  getAggLabel(aggType: AGG_TYPE, fieldName: string): string;
  getMetricFields(): IESAggField[];
}

export class AbstractESAggSource extends AbstractESSource implements IESAggSource {
  getAggKey(aggType: AGG_TYPE, fieldName: string): string;
  getAggLabel(aggType: AGG_TYPE, fieldName: string): string;
  getMetricFields(): IESAggField[];
}
