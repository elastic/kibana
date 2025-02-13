/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-plugin/common';
import { IField } from '../field';
import { IESAggSource } from '../../sources/es_agg_source';
import { FIELD_ORIGIN } from '../../../../common/constants';
import { AggDescriptor } from '../../../../common/descriptor_types';

export interface IESAggField extends IField {
  getValueAggDsl(indexPattern: DataView): unknown | null;
  getBucketCount(): number;
  getMask(): AggDescriptor['mask'] | undefined;
}

export interface CountAggFieldParams {
  label?: string;
  source: IESAggSource;
  origin: FIELD_ORIGIN;
  mask?: AggDescriptor['mask'];
}
