/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_FIELD_TYPES } from '../../common/constants/field_types';
import {
  ML_JOB_AGGREGATION,
  KIBANA_AGGREGATION,
  ES_AGGREGATION,
} from '../../common/constants/aggregation_types';

export const EVENT_RATE_FIELD_ID = '__ml_event_rate_count__';
export const METRIC_AGG_TYPE = 'metrics';

export type FieldId = string;
export type AggId = ML_JOB_AGGREGATION;
export type SplitField = Field | null;

export interface Field {
  id: FieldId;
  name: string;
  type: ES_FIELD_TYPES;
  aggregatable: boolean;
  aggIds?: AggId[];
  aggs?: Aggregation[];
}

export interface Aggregation {
  id: AggId;
  title: string;
  kibanaName: KIBANA_AGGREGATION;
  dslName: ES_AGGREGATION;
  type: typeof METRIC_AGG_TYPE;
  mlModelPlotAgg: {
    min: string;
    max: string;
  };
  fieldIds?: FieldId[];
  fields?: Field[];
}

export interface NewJobCaps {
  fields: Field[];
  aggs: Aggregation[];
}

export interface AggFieldPair {
  agg: Aggregation;
  field: Field;
  by?: {
    field: SplitField;
    value: string | null;
  };
}

export interface AggFieldNamePair {
  agg: string;
  field: string;
  by?: {
    field: string | null;
    value: string | null;
  };
}
