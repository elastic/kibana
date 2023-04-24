/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { ML_JOB_AGGREGATION, KIBANA_AGGREGATION, ES_AGGREGATION } from './aggregation_types';
import { MLCATEGORY } from './field_types';

/**
 * EVENT_RATE_FIELD_ID
 * @type {"__ml_event_rate_count__"}
 */
export const EVENT_RATE_FIELD_ID = '__ml_event_rate_count__';

/**
 * METRIC_AGG_TYPE
 * @export
 * @type {"metrics"}
 */
export const METRIC_AGG_TYPE = 'metrics';

/**
 * Field id
 * @export
 * @typedef {FieldId}
 */
export type FieldId = string;

/**
 * AggId is an alias of ML_JOB_AGGREGATION
 * @export
 * @typedef {AggId}
 */
export type AggId = ML_JOB_AGGREGATION;

/**
 * Split field can be Field or null.
 * @export
 * @typedef {SplitField}
 */
export type SplitField = Field | null;

/**
 * Field definition
 * @export
 * @interface Field
 * @typedef {Field}
 */
export interface Field {
  /**
   * The field id
   * @type {FieldId}
   */
  id: FieldId;
  /**
   * The field name
   * @type {string}
   */
  name: string;
  /**
   * The field type is based on ES field types.
   * @type {ES_FIELD_TYPES}
   */
  type: ES_FIELD_TYPES;
  /**
   * Flag whether the field is aggregatable.
   * @type {boolean}
   */
  aggregatable: boolean;
  /**
   * Flag for counter.
   * @type {boolean}
   */
  counter: boolean;
  /**
   * Optional array of AggId.
   * @type {?AggId[]}
   */
  aggIds?: AggId[];
  /**
   * Optional array fo aggregations.
   * @type {?Aggregation[]}
   */
  aggs?: Aggregation[];
  /**
   * Optional runtime field.
   * @type {?estypes.MappingRuntimeField}
   */
  runtimeField?: estypes.MappingRuntimeField;
}

/**
 * Aggregation definition.
 * @export
 * @interface Aggregation
 * @typedef {Aggregation}
 */
export interface Aggregation {
  /**
   * The aggregation id.
   * @type {AggId}
   */
  id: AggId;
  /**
   * The aggregation title.
   * @type {string}
   */
  title: string;
  /**
   * The Kibana name for the aggregation.
   * @type {(KIBANA_AGGREGATION | null)}
   */
  kibanaName: KIBANA_AGGREGATION | null;
  /**
   * The ES DSL name for the aggregation.
   * @type {(ES_AGGREGATION | null)}
   */
  dslName: ES_AGGREGATION | null;
  /**
   * The metric agg type.
   * @type {typeof METRIC_AGG_TYPE}
   */
  type: typeof METRIC_AGG_TYPE;
  /**
   * The model lot agg definition.
   * @type {{
      min: string;
      max: string;
    }}
   */
  mlModelPlotAgg: {
    min: string;
    max: string;
  };
  /**
   * Optional array of field ids.
   * @type {?FieldId[]}
   */
  fieldIds?: FieldId[];
  /**
   * Optional array or fields.
   * @type {?Field[]}
   */
  fields?: Field[];
}

/**
 * Job caps for a new job.
 * @export
 * @interface NewJobCaps
 * @typedef {NewJobCaps}
 */
export interface NewJobCaps {
  /**
   * Array of fields.
   * @type {Field[]}
   */
  fields: Field[];
  /**
   * Array of aggregations.
   * @type {Aggregation[]}
   */
  aggs: Aggregation[];
}

/**
 * Job caps response for a new job.
 * @export
 * @interface NewJobCapsResponse
 * @typedef {NewJobCapsResponse}
 */
export interface NewJobCapsResponse {
  /**
   * Index pattern
   */
  [indexPattern: string]: NewJobCaps;
}

/**
 * Definition for a pair of aggregation and field.
 * @export
 * @interface AggFieldPair
 * @typedef {AggFieldPair}
 */
export interface AggFieldPair {
  /**
   * The aggregation.
   * @type {Aggregation}
   */
  agg: Aggregation;
  /**
   * The field.
   * @type {Field}
   */
  field: Field;
  /**
   * Optional by-field configuration.
   * @type {?{
      field: SplitField;
      value: string | null;
    }}
   */
  by?: {
    field: SplitField;
    value: string | null;
  };
  /**
   * Optional over-field configuration
   * @type {?{
      field: SplitField;
      value: string | null;
    }}
   */
  over?: {
    field: SplitField;
    value: string | null;
  };
  /**
   * Optional partition field configuration
   * @type {?{
      field: SplitField;
      value: string | null;
    }}
   */
  partition?: {
    field: SplitField;
    value: string | null;
  };
  /**
   * Optional exclude frequent.
   * @type {?string}
   */
  excludeFrequent?: string;
}

/**
 * Definition for a pair of aggregation and field name.
 * @export
 * @interface AggFieldNamePair
 * @typedef {AggFieldNamePair}
 */
export interface AggFieldNamePair {
  /**
   * The aggregation definition.
   * @type {string}
   */
  agg: string;
  /**
   * The field name
   * @type {string}
   */
  field: string;
  /**
   * Optional by-field configuration
   * @type {?{
      field: string | null;
      value: string | null;
    }}
   */
  by?: {
    field: string | null;
    value: string | null;
  };
  /**
   * Optional over-field configuration
   * @type {?{
      field: string | null;
      value: string | null;
    }}
   */
  over?: {
    field: string | null;
    value: string | null;
  };
  /**
   * Optional partition-field configuration
   * @type {?{
      field: string | null;
      value: string | null;
    }}
   */
  partition?: {
    field: string | null;
    value: string | null;
  };
  /**
   * Optional exclude frequent.
   * @type {?string}
   */
  excludeFrequent?: string;
}

/**
 * Definition for an ml category.
 * @type {Field}
 */
export const mlCategory: Field = {
  /**
   * id `mlcategory` id
   */
  id: MLCATEGORY,
  /**
   * name `mlcategory`
   */
  name: MLCATEGORY,
  /**
   * type `keyword`
   */
  type: ES_FIELD_TYPES.KEYWORD,
  /**
   * non-aggregatable
   */
  aggregatable: false,
  /**
   * no counter
   */
  counter: false,
};

/**
 * Rollup fields are a nested record of field ids and ES aggregations.
 * @typedef {RollupFields}
 */
export type RollupFields = Record<FieldId, [Record<'agg', ES_AGGREGATION>]>;

/**
 * Alias for `estypes.MappingRuntimeFields`.
 * @export
 * @typedef {RuntimeMappings}
 */
export type RuntimeMappings = estypes.MappingRuntimeFields;
