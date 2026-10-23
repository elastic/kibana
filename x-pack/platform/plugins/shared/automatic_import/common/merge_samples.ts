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

const merge = (target: SampleObject, source: SampleObject): SampleObject => {
  const result = Object.create(null) as SampleObject;

  for (const [key, value] of Object.entries(target)) {
    if (!isUnsafeProperty(key)) {
      result[key] = value;
    }
  }

  for (const [key, sourceValue] of Object.entries(source)) {
    if (!isUnsafeProperty(key)) {
      const targetValue = result[key];

      if (Array.isArray(sourceValue)) {
        result[key] = Array.isArray(targetValue)
          ? [...targetValue, ...sourceValue]
          : [...sourceValue];
      } else if (isObject(sourceValue)) {
        if (!isObject(targetValue) || isEmptyValue(targetValue)) {
          result[key] = merge(Object.create(null), sourceValue);
        } else {
          result[key] = merge(targetValue, sourceValue);
        }
      } else if (!(key in result) || (isEmptyValue(targetValue) && !isEmptyValue(sourceValue))) {
        result[key] = sourceValue;
      }
    }
  }

  return result;
};

/**
 * Deep-merges sample objects into one representative object: arrays are concatenated, objects
 * win over scalars, and the first non-empty scalar wins.
 */
export const mergeSamples = (samples: readonly SampleObject[]): SampleObject =>
  samples.reduce<SampleObject>((result, sample) => merge(result, sample), {});

/** Merges the object elements of an array, or returns undefined when it has none. */
export const mergeObjectElements = (values: readonly unknown[]): SampleObject | undefined => {
  const objectElements = values.filter(isObject);
  return objectElements.length > 0 ? mergeSamples(objectElements) : undefined;
};
