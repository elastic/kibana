/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueLiteralValue } from '@kbn/streams-schema';

export type FormValue = CatalogueLiteralValue;
export interface ObjectValue {
  [key: string]: FormValue;
}
/** Error messages keyed by JSON pointer into the form values, e.g. `/fields/0/path`. */
export type FieldErrors = Record<string, string>;

export const isObjectValue = (value: FormValue | undefined): value is ObjectValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isEmptyValue = (value: FormValue | undefined): boolean =>
  value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

/** Narrows an arbitrary unit config value to a JSON-like form value. */
export const toFormValue = (value: unknown): FormValue | undefined => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const converted = toFormValue(item);
      return converted === undefined ? [] : [converted];
    });
  }
  if (typeof value === 'object') {
    const result: ObjectValue = {};
    for (const [key, item] of Object.entries(value)) {
      const converted = toFormValue(item);
      if (converted !== undefined) {
        result[key] = converted;
      }
    }
    return result;
  }
  return undefined;
};

const escapeSegment = (segment: string | number): string =>
  String(segment).replace(/~/g, '~0').replace(/\//g, '~1');

export const joinPointer = (base: string, segment: string | number): string =>
  `${base}/${escapeSegment(segment)}`;

const unescapeSegment = (segment: string): string =>
  segment.replace(/~1/g, '/').replace(/~0/g, '~');

/** Resolves a JSON pointer such as `/action` against an object value. */
export const getAtPointer = (
  root: FormValue | undefined,
  pointer: string
): FormValue | undefined => {
  if (pointer === '' || pointer === '/') {
    return root;
  }
  const segments = pointer.replace(/^\//, '').split('/').map(unescapeSegment);
  let current: FormValue | undefined = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (isObjectValue(current)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
};

export const errorsUnder = (errors: FieldErrors, pointer: string): boolean =>
  Object.keys(errors).some((key) => key === pointer || key.startsWith(`${pointer}/`));
