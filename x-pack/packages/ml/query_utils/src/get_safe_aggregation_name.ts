/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns a name which is safe to use in elasticsearch aggregations for the supplied
 * field name. Aggregation names must be alpha-numeric and can only contain '_' and '-' characters,
 * so if the supplied field names contains disallowed characters, the provided index
 * identifier is used to return a safe 'dummy' name in the format 'field_index' e.g. field_0, field_1
 *
 * @param fieldName - the field name to check
 * @param index - the index number to be used for the safe aggregation name
 * @returns safe aggregation name
 */
export function getSafeAggregationName(fieldName: string, index: number): string {
  return fieldName.match(/^[a-zA-Z0-9-_.]+$/) ? fieldName : `field_${index}`;
}
