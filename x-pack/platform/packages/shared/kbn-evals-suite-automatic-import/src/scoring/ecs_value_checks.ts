/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIP } from 'net';
import type { EcsFields } from './ecs_fields';
import type { ExtraField } from './score_run';

/** Allowed values that ingest pipelines must not set: `signal` is reserved for Kibana alerting. */
const PIPELINE_FORBIDDEN_VALUES: Readonly<Record<string, readonly string[]>> = {
  'event.kind': ['signal'],
};

const INTEGER_TYPES = new Set(['byte', 'short', 'integer', 'long', 'unsigned_long']);
const DECIMAL_TYPES = new Set(['half_float', 'float', 'double', 'scaled_float']);

const isNumeric = (value: unknown): boolean =>
  (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
  Number.isFinite(Number(value));

const fitsType = (type: string | undefined, value: unknown): boolean => {
  if (type === 'ip') {
    return typeof value === 'string' && isIP(value) !== 0;
  }
  if (type && INTEGER_TYPES.has(type)) {
    return isNumeric(value) && Number.isInteger(Number(value));
  }
  if (type && DECIMAL_TYPES.has(type)) {
    return isNumeric(value);
  }
  if (type === 'date') {
    return isNumeric(value) || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
  }
  if (type === 'boolean') {
    return typeof value === 'boolean' || value === 'true' || value === 'false';
  }
  return value !== null && value !== undefined;
};

const toValues = (value: unknown): unknown[] => {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

/** `event.type` values ECS allows for the doc's `event.category` values; empty if unconstrained. */
const expectedEventTypes = (doc: Record<string, unknown>, ecsFields: EcsFields): Set<string> => {
  const allowedCategories = ecsFields.get('event.category')?.allowedValues ?? [];
  return new Set(
    toValues(doc['event.category']).flatMap(
      (category) =>
        allowedCategories.find(({ name }) => name === category)?.expectedEventTypes ?? []
    )
  );
};

/**
 * Whether an extra field's value is valid ECS: it fits the field's type, is one of the field's
 * allowed values that a pipeline may set, and `event.type` is allowed for the doc's `event.category`.
 */
export const isValidEcsValue = (
  { field, value, doc }: ExtraField,
  ecsFields: EcsFields
): boolean => {
  const { type, allowedValues } = ecsFields.get(field) ?? {};
  const values = toValues(value);
  if (values.length === 0 || !values.every((item) => fitsType(type, item))) {
    return false;
  }
  if (
    allowedValues?.length &&
    !values.every((item) => allowedValues.some(({ name }) => name === item))
  ) {
    return false;
  }
  if (values.some((item) => PIPELINE_FORBIDDEN_VALUES[field]?.includes(String(item)))) {
    return false;
  }
  if (field !== 'event.type' && field !== 'event.category') {
    return true;
  }
  const eventTypes = expectedEventTypes(doc, ecsFields);
  return (
    eventTypes.size === 0 ||
    toValues(doc['event.type']).every((item) => eventTypes.has(String(item)))
  );
};
