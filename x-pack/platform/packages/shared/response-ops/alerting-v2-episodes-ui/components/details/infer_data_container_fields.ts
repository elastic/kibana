/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { FieldSpec } from '@kbn/data-views-plugin/common';

type InferredType = Pick<FieldSpec, 'type' | 'esTypes'>;

// ISO 8601 date, with optional time and offset. Plain numbers or free text never match.
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const isIsoDate = (value: string): boolean =>
  ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));

const inferScalarType = (value: unknown): InferredType | undefined => {
  switch (typeof value) {
    case 'number':
      return Number.isInteger(value)
        ? { type: 'number', esTypes: ['long'] }
        : { type: 'number', esTypes: ['double'] };
    case 'boolean':
      return { type: 'boolean', esTypes: ['boolean'] };
    case 'string':
      return isIsoDate(value)
        ? { type: 'date', esTypes: ['date'] }
        : { type: 'string', esTypes: ['keyword'] };
    default:
      return undefined;
  }
};

// Arrays get a type only when all their non-null values agree on one.
const inferArrayType = (values: unknown[]): InferredType | undefined => {
  const types = values.filter((value) => value != null).map(inferScalarType);
  const [first] = types;
  if (!first || types.some((type) => type?.type !== first.type)) {
    return undefined;
  }
  const esTypes = new Set(types.flatMap((type) => type?.esTypes ?? []));
  // Mixed integers and decimals are all decimals.
  return esTypes.size > 1 ? { type: first.type, esTypes: ['double'] } : first;
};

const inferType = (value: unknown): InferredType | undefined =>
  Array.isArray(value) ? inferArrayType(value) : inferScalarType(value);

const collectFields = (
  fields: Record<string, FieldSpec>,
  value: Record<string, unknown>,
  path: string
) => {
  for (const [key, child] of Object.entries(value)) {
    // Top level `_` names are kept unprefixed as ES metadata, so they would never match.
    if (!path && key.startsWith('_')) {
      continue;
    }
    const name = `${path}${key}`;
    // Objects are walked like flattenHit does, so names match the flattened hit.
    if (isPlainObject(child)) {
      collectFields(fields, child as Record<string, unknown>, `${name}.`);
      continue;
    }
    const inferred = inferType(child);
    if (!inferred) {
      continue;
    }
    fields[name] = {
      name,
      ...inferred,
      // The hit is synthetic, nothing can be searched or aggregated on it.
      searchable: false,
      aggregatable: false,
    };
  }
};

/**
 * Guesses field specs from the values of an alert `data` object. Names are relative to
 * `data` (e.g. `host.name`), like the fields of a rule source data view.
 */
export const inferDataContainerFieldSpecs = (
  data: Record<string, unknown>
): Record<string, FieldSpec> => {
  const fields: Record<string, FieldSpec> = {};
  collectFields(fields, data, '');
  return fields;
};
