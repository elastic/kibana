/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Contains functions for operations commonly performed on anomaly data
 * to extract information for display in dashboards.
 */

import type { MlSeverityType } from './anomaly_severity';
import { ML_ANOMALY_THRESHOLD } from './anomaly_threshold';
import { ML_ANOMALY_SEVERITY_TYPES } from './anomaly_severity_types';
import type { MlAnomaliesTableRecord, MlAnomalyRecordDoc } from './types';
import { ML_DETECTOR_RULE_CONDITIONS_NOT_SUPPORTED_FUNCTIONS } from './detector_rule';

/**
 * Enum of entity field types
 */
export enum ML_ENTITY_FIELD_TYPE {
  BY = 'by',
  OVER = 'over',
  PARTITON = 'partition',
}

/**
 * Custom enum of entity field operations
 */
export const ML_ENTITY_FIELD_OPERATIONS = {
  ADD: '+',
  REMOVE: '-',
} as const;

/**
 * Union type of entity field operations
 */
export type MlEntityFieldOperation =
  (typeof ML_ENTITY_FIELD_OPERATIONS)[keyof typeof ML_ENTITY_FIELD_OPERATIONS];

/**
 * Interface of an entity field
 */
export interface MlEntityField {
  /**
   * The field name
   */
  fieldName: string;
  /**
   * The field value
   */
  fieldValue: string | number | undefined;
  /**
   * Optional field type
   */
  fieldType?: ML_ENTITY_FIELD_TYPE;
  /**
   * Optional entity field operation
   */
  operation?: MlEntityFieldOperation;
  /**
   * Optional cardinality of field
   */
  cardinality?: number;
}

// List of function descriptions for which actual values from record level results should be displayed.
const DISPLAY_ACTUAL_FUNCTIONS = [
  'count',
  'distinct_count',
  'lat_long',
  'mean',
  'max',
  'min',
  'sum',
  'median',
  'varp',
  'info_content',
  'time',
];

// List of function descriptions for which typical values from record level results should be displayed.
const DISPLAY_TYPICAL_FUNCTIONS = [
  'count',
  'distinct_count',
  'lat_long',
  'mean',
  'max',
  'min',
  'sum',
  'median',
  'varp',
  'info_content',
  'time',
];

/**
 * Returns whether the anomaly is in a categorization analysis.
 * @param anomaly Anomaly table record
 */
export function isCategorizationAnomaly(anomaly: MlAnomaliesTableRecord): boolean {
  return anomaly.entityName === 'mlcategory';
}

/**
 * Returns a severity label (one of critical, major, minor, warning, low or unknown)
 * for the supplied normalized anomaly score (a value between 0 and 100), where scores
 * less than 3 are assigned a severity of 'low'.
 * @param normalizedScore - A normalized score between 0-100, which is based on the probability of the anomalousness of this record
 */
export function getSeverityWithLow(normalizedScore: number): MlSeverityType {
  if (normalizedScore >= ML_ANOMALY_THRESHOLD.CRITICAL) {
    return ML_ANOMALY_SEVERITY_TYPES.critical;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MAJOR) {
    return ML_ANOMALY_SEVERITY_TYPES.major;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.MINOR) {
    return ML_ANOMALY_SEVERITY_TYPES.minor;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.WARNING) {
    return ML_ANOMALY_SEVERITY_TYPES.warning;
  } else if (normalizedScore >= ML_ANOMALY_THRESHOLD.LOW) {
    return ML_ANOMALY_SEVERITY_TYPES.low;
  } else {
    return ML_ANOMALY_SEVERITY_TYPES.unknown;
  }
}

/**
 * Returns whether the anomaly record should be indicated in the UI as a multi-bucket anomaly,
 * for example in anomaly charts with a cross-shaped marker.
 * @param anomaly Anomaly table record
 */
export function isMultiBucketAnomaly(anomaly: MlAnomalyRecordDoc): boolean {
  if (anomaly.anomaly_score_explanation === undefined) {
    return false;
  }

  const sb = anomaly.anomaly_score_explanation.single_bucket_impact;
  const mb = anomaly.anomaly_score_explanation.multi_bucket_impact;

  if (mb === undefined || mb === 0) {
    return false;
  }

  if (sb !== undefined && sb > mb) {
    return false;
  }

  if ((sb === undefined || sb === 0) && mb > 0) {
    return true;
  }

  // Basis of use of 1.7 comes from the backend calculation for
  // the single- and multi-bucket impacts
  // 1.7 = 5.0/lg(e)/ln(1000)
  // with the computation of the logarithm basis changed from e to 10.
  if (sb !== undefined && mb > sb) {
    return (((mb - sb) * mb) / sb) * 1.7 >= 2;
  }

  return false;
}

/**
 * Returns the value on a scale of 1 to 5, from a log based scaled value for an
 * anomaly score explanation impact field, such as anomaly_characteristics_impact,
 * single_bucket_impact or multi_bucket_impact.
 * @param score value from an impact field from the anomaly_score_explanation.
 * @returns numeric value on an integer scale of 1 (low) to 5 (high).
 */
export function getAnomalyScoreExplanationImpactValue(score: number): number {
  if (score < 2) return 1;
  if (score < 4) return 2;
  if (score < 7) return 3;
  if (score < 12) return 4;
  return 5;
}

/**
 * Returns the name of the field to use as the entity name from the source record
 * obtained from Elasticsearch. The function looks first for a by_field, then over_field,
 * then partition_field, returning undefined if none of these fields are present.
 * @param record - anomaly record result for which to obtain the entity field name.
 */
export function getEntityFieldName(record: MlAnomalyRecordDoc): string | undefined {
  // Analyses with by and over fields, will have a top-level by_field_name, but
  // the by_field_value(s) will be in the nested causes array.
  if (record.by_field_name !== undefined && record.by_field_value !== undefined) {
    return record.by_field_name;
  }

  if (record.over_field_name !== undefined) {
    return record.over_field_name;
  }

  if (record.partition_field_name !== undefined) {
    return record.partition_field_name;
  }
}

/**
 * Returns the value of the field to use as the entity value from the source record
 * obtained from Elasticsearch. The function looks first for a by_field, then over_field,
 * then partition_field, returning undefined if none of these fields are present.
 * @param record - anomaly record result for which to obtain the entity field value.
 */
export function getEntityFieldValue(record: MlAnomalyRecordDoc): string | number | undefined {
  if (record.by_field_value !== undefined) {
    return record.by_field_value;
  }

  if (record.over_field_value !== undefined) {
    return record.over_field_value;
  }

  if (record.partition_field_value !== undefined) {
    return record.partition_field_value;
  }
}

/**
 * Returns the list of partitioning entity fields for the source record as a list
 * of objects in the form { fieldName: airline, fieldValue: AAL, fieldType: partition }
 * @param record - anomaly record result for which to obtain the entity field list.
 */
export function getEntityFieldList(record: MlAnomalyRecordDoc): MlEntityField[] {
  const entityFields: MlEntityField[] = [];
  if (record.partition_field_name !== undefined) {
    entityFields.push({
      fieldName: record.partition_field_name,
      fieldValue: record.partition_field_value,
      fieldType: ML_ENTITY_FIELD_TYPE.PARTITON,
    });
  }

  if (record.over_field_name !== undefined) {
    entityFields.push({
      fieldName: record.over_field_name,
      fieldValue: record.over_field_value,
      fieldType: ML_ENTITY_FIELD_TYPE.OVER,
    });
  }

  // For jobs with by and over fields, don't add the 'by' field as this
  // field will only be added to the top-level fields for record type results
  // if it also an influencer over the bucket.
  if (record.by_field_name !== undefined && record.over_field_name === undefined) {
    entityFields.push({
      fieldName: record.by_field_name,
      fieldValue: record.by_field_value,
      fieldType: ML_ENTITY_FIELD_TYPE.BY,
    });
  }

  return entityFields;
}

/**
 * Returns whether actual values should be displayed for a record with the specified function description.
 * Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
 * whereas the 'function_description' field holds a ML-built display hint for function e.g. 'count'.
 * @param functionDescription - function_description value for the anomaly record
 */
export function showActualForFunction(functionDescription: string): boolean {
  return DISPLAY_ACTUAL_FUNCTIONS.indexOf(functionDescription) > -1;
}

/**
 * Returns whether typical values should be displayed for a record with the specified function description.
 * Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
 * whereas the 'function_description' field holds a ML-built display hint for function e.g. 'count'.
 * @param functionDescription - function_description value for the anomaly record
 */
export function showTypicalForFunction(functionDescription: string): boolean {
  return DISPLAY_TYPICAL_FUNCTIONS.indexOf(functionDescription) > -1;
}

/**
 * Returns whether a rule can be configured against the specified anomaly.
 * @param record - anomaly record result
 */
export function isRuleSupported(record: MlAnomalyRecordDoc): boolean {
  // A rule can be configured with a numeric condition if the function supports it,
  // and/or with scope if there is a partitioning fields.
  return (
    ML_DETECTOR_RULE_CONDITIONS_NOT_SUPPORTED_FUNCTIONS.indexOf(record.function) === -1 ||
    getEntityFieldName(record) !== undefined
  );
}

/**
 * Two functions for converting aggregation type names.
 * ML and ES use different names for the same function.
 * Possible values for ML aggregation type are (defined in lib/model/CAnomalyDetector.cc):
 *    count
 *    distinct_count
 *    rare
 *    info_content
 *    mean
 *    median
 *    min
 *    max
 *    varp
 *    sum
 *    lat_long
 *    time
 * The input to toES and the output from toML correspond to the value of the
 * function_description field of anomaly records.
 */
export const aggregationTypeTransform = {
  /**
   * transform from ML to ES agg type
   * @param {string} oldAggType the aggregation type to be transformed
   * @returns {string}
   */
  toES(oldAggType: string): string {
    let newAggType = oldAggType;

    if (newAggType === 'mean') {
      newAggType = 'avg';
    } else if (newAggType === 'distinct_count') {
      newAggType = 'cardinality';
    } else if (newAggType === 'median') {
      newAggType = 'percentiles';
    }

    return newAggType;
  },
  /**
   * transform from ES to ML agg type
   * @param {string} oldAggType the aggregation type to be transformed
   * @returns {string}
   */
  toML(oldAggType: string): string {
    let newAggType = oldAggType;

    if (newAggType === 'avg') {
      newAggType = 'mean';
    } else if (newAggType === 'cardinality') {
      newAggType = 'distinct_count';
    } else if (newAggType === 'percentiles') {
      newAggType = 'median';
    }

    return newAggType;
  },
};
