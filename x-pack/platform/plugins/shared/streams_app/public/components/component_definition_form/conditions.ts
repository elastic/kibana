/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type {
  CatalogueCondition,
  CatalogueFieldDefinition,
  CatalogueSignal,
} from '@kbn/streams-schema';
import { getAtPointer, type ObjectValue } from './values';

/** Evaluates a catalogue condition against the object that contains the field. */
export const evaluateCondition = (
  condition: CatalogueCondition,
  scope: ObjectValue,
  telemetry: readonly CatalogueSignal[]
): boolean => {
  if ('all' in condition) {
    return condition.all.every((child) => evaluateCondition(child, scope, telemetry));
  }
  if ('any' in condition) {
    return condition.any.some((child) => evaluateCondition(child, scope, telemetry));
  }
  if ('not' in condition) {
    return !evaluateCondition(condition.not, scope, telemetry);
  }
  if ('telemetry_contains' in condition) {
    return telemetry.includes(condition.telemetry_contains);
  }
  const actual = getAtPointer(scope, condition.path);
  switch (condition.operator) {
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'eq':
      return isEqual(actual, condition.value);
    case 'neq':
      return !isEqual(actual, condition.value);
    case 'contains':
      if (Array.isArray(actual)) {
        return actual.some((item) => isEqual(item, condition.value));
      }
      return (
        typeof actual === 'string' &&
        typeof condition.value === 'string' &&
        actual.includes(condition.value)
      );
  }
};

export const isFieldAvailable = (
  field: CatalogueFieldDefinition,
  scope: ObjectValue,
  telemetry: readonly CatalogueSignal[]
): boolean =>
  field.available_when === undefined || evaluateCondition(field.available_when, scope, telemetry);

export const isFieldRequired = (
  field: CatalogueFieldDefinition,
  scope: ObjectValue,
  telemetry: readonly CatalogueSignal[]
): boolean =>
  Boolean(field.required) ||
  (field.required_when !== undefined && evaluateCondition(field.required_when, scope, telemetry));
