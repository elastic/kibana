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
          for (const element of sourceValue) {
            targetValue.push(element);
          }
        } else if (isObject(targetValue) && !isEmptyValue(targetValue)) {
          mergeObjectElementsInto(targetValue, sourceValue);
        } else {
          target[key] = [...sourceValue];
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
      } else if (!(key in target) || (isEmptyValue(targetValue) && !isEmptyValue(sourceValue))) {
        target[key] = sourceValue;
      }
    }
  }

  return target;
};

/**
 * Deep-merges sample objects into one representative object without changing them: arrays are
 * concatenated, an object and an array of objects under the same key are merged together, objects
 * win over scalars, and the first non-empty value wins.
 */
export const mergeSamples = (samples: readonly SampleObject[]): SampleObject => {
  const result = Object.create(null) as SampleObject;
  for (const sample of samples) {
    mergeInto(result, sample);
  }
  return result;
};

/** Merges the object elements of an array, or returns undefined when it has none. */
export const mergeObjectElements = (values: readonly unknown[]): SampleObject | undefined => {
  const objectElements = values.filter(isObject);
  return objectElements.length > 0 ? mergeSamples(objectElements) : undefined;
};
