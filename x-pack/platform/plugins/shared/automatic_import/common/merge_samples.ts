/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type SampleObject = Record<string, unknown>;

const isObject = (value: unknown): value is SampleObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEmptyValue = (value: unknown): boolean => {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
};

const isScalar = (value: unknown): boolean => value != null && typeof value !== 'object';

/** The values already in each array the merge created, so repeated values are kept once. */
const seenValues = new WeakMap<unknown[], Set<unknown>>();

const appendDistinct = (target: unknown[], values: readonly unknown[]): unknown[] => {
  let seen = seenValues.get(target);
  if (!seen) {
    seen = new Set(target);
    seenValues.set(target, seen);
  }
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      target.push(value);
    }
  }
  return target;
};

/** Returns the value to keep when a sample has a plain value (not an object or array) for a key. */
const mergePlainValue = (target: unknown, source: unknown): unknown => {
  if (isEmptyValue(target) && !isEmptyValue(source)) return source;
  if (Array.isArray(target) && isScalar(source)) return appendDistinct(target, [source]);
  if (isScalar(target) && isScalar(source)) return target === source ? target : [target, source];
  return target;
};

export const isUnsafeProperty = (key: string): boolean =>
  key === '__proto__' || key === 'constructor' || key === 'prototype';

/**
 * Merges `source` into `target` in place. `target` and the objects and arrays in it are always
 * created here, never taken from a sample, so appending to them leaves the samples unchanged.
 */
const mergeInto = (target: SampleObject, source: SampleObject): SampleObject => {
  const mergeObjectElementsInto = (into: SampleObject, values: readonly unknown[]): void => {
    for (const value of values) {
      if (isObject(value)) {
        mergeInto(into, value);
      }
    }
  };

  for (const [key, sourceValue] of Object.entries(source)) {
    if (!isUnsafeProperty(key)) {
      const targetValue = target[key];

      if (Array.isArray(sourceValue)) {
        if (sourceValue.length === 0) {
          if (isEmptyValue(targetValue)) {
            target[key] = [];
          }
        } else if (Array.isArray(targetValue)) {
          appendDistinct(targetValue, sourceValue);
        } else if (isObject(targetValue) && !isEmptyValue(targetValue)) {
          mergeObjectElementsInto(targetValue, sourceValue);
        } else {
          target[key] = appendDistinct(isScalar(targetValue) ? [targetValue] : [], sourceValue);
        }
      } else if (isObject(sourceValue)) {
        if (isObject(targetValue)) {
          mergeInto(targetValue, sourceValue);
        } else {
          const merged = Object.create(null) as SampleObject;
          if (Array.isArray(targetValue)) {
            mergeObjectElementsInto(merged, targetValue);
          }
          target[key] = mergeInto(merged, sourceValue);
        }
      } else {
        target[key] = key in target ? mergePlainValue(targetValue, sourceValue) : sourceValue;
      }
    }
  }

  return target;
};

/**
 * Deep-merges sample objects into one representative object without changing them. Every distinct
 * plain value is kept once: values and arrays under the same key are combined into one array, in
 * sample order, so field types can be inferred from all of them. An object and an array of objects
 * under the same key are merged together, and objects win over plain values.
 */
export const mergeSamples = (samples: readonly SampleObject[]): SampleObject => {
  const result = Object.create(null) as SampleObject;
  for (const sample of samples) {
    mergeInto(result, sample);
  }
  return result;
};

/**
 * Merges the object elements of an array, or returns undefined when it has none. Other elements are
 * dropped, so a field mapped from an array that mixes objects and plain values can't index those
 * plain values. That's a known limitation: no mapping accepts both.
 */
export const mergeObjectElements = (values: readonly unknown[]): SampleObject | undefined => {
  const objectElements = values.filter(isObject);
  return objectElements.length > 0 ? mergeSamples(objectElements) : undefined;
};

/**
 * Combines the types of a field's values into the one type that accepts them all: their shared
 * type, `double` for whole and decimal numbers, or `fallbackType` for any other mix or no values.
 */
export const mergeValueTypes = (types: readonly string[], fallbackType: string): string => {
  const distinctTypes = new Set(types);
  if (distinctTypes.size === 1) return types[0];
  if (distinctTypes.size === 2 && distinctTypes.has('long') && distinctTypes.has('double')) {
    return 'double';
  }
  return fallbackType;
};
