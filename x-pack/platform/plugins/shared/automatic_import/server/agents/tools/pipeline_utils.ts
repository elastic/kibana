/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

export const STRIPPED_OUTPUT_FIELDS = new Set(['event.original', 'ecs.version']);

export interface SimulateDocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
    [key: string]: unknown;
  };
}

export const formatSimulateDoc = (sample: string): SimulateDocTemplate => ({
  _index: 'index',
  _id: 'id',
  _source: { message: sample },
});

export interface FailedSample {
  sampleIndex?: number;
  sample: string;
  error: string;
}

export interface ErrorGroup {
  error: string;
  count: number;
  exampleSample: string;
}

export const groupErrors = (
  failedSamples: FailedSample[],
  maxGroups: number,
  sampleTruncate = 300
): ErrorGroup[] => {
  const groups = new Map<string, { count: number; example: string }>();

  for (const { error, sample } of failedSamples) {
    const existing = groups.get(error);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(error, { count: 1, example: sample.substring(0, sampleTruncate) });
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxGroups)
    .map(([error, { count, example }]) => ({
      error,
      count,
      exampleSample: example,
    }));
};

export const stripBoilerplateFields = (
  source: Record<string, unknown>
): Record<string, unknown> => {
  const result = { ...source };
  for (const field of STRIPPED_OUTPUT_FIELDS) {
    const dotIdx = field.indexOf('.');
    if (dotIdx !== -1) {
      const root = field.substring(0, dotIdx);
      const child = field.substring(dotIdx + 1);
      const rootObj = result[root];
      if (rootObj != null && typeof rootObj === 'object' && !Array.isArray(rootObj)) {
        const copy = { ...(rootObj as Record<string, unknown>) };
        delete copy[child];
        if (Object.keys(copy).length === 0) {
          delete result[root];
        } else {
          result[root] = copy;
        }
      }
    } else {
      delete result[field];
    }
  }
  return result;
};

const VALID_FIELD_NAME_SEGMENT = /^[a-z0-9_]+$/;

/**
 * Converts an arbitrary key (camelCase, free text, punctuation) into a lowercase snake_case name.
 */
export const toSnakeCase = (segment: string): string =>
  segment
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Returns one error per custom-namespaced field whose name is not lowercase snake_case,
 * each with the corrected field path to rename to when one can be derived safely.
 */
export const validateCustomFieldNames = (
  fieldPaths: Iterable<string>,
  customFieldPrefix: string
): string[] => {
  const allPaths = new Set(fieldPaths);
  const errors: string[] = [];

  for (const fieldPath of allPaths) {
    if (fieldPath.startsWith(customFieldPrefix)) {
      const segments = fieldPath.substring(customFieldPrefix.length).split('.');
      const invalid = segments.filter((segment) => !VALID_FIELD_NAME_SEGMENT.test(segment));
      if (invalid.length > 0) {
        const converted = segments.map(toSnakeCase);
        const suggestedPath = converted.every((segment) => segment.length > 0)
          ? `${customFieldPrefix}${converted.join('.')}`
          : undefined;
        const advice =
          suggestedPath === undefined
            ? 'No usable name is left after conversion; choose a descriptive snake_case name.'
            : allPaths.has(suggestedPath)
            ? `'${suggestedPath}' already exists: merge the two fields or choose a distinct snake_case name.`
            : `Rename it to '${suggestedPath}'.`;
        errors.push(
          `Field '${fieldPath}' is not a valid custom field name: '${invalid.join(
            "', '"
          )}' must be lowercase snake_case (letters, digits and underscores only). ${advice} ` +
            `If the name comes from log content (e.g. a kv key that is free text), fix the parsing instead of using the text as a field name.`
        );
      }
    }
  }

  return errors;
};

export interface SimulationResults {
  failedSamples: FailedSample[];
  successfulDocuments: Array<Record<string, unknown>>;
  successfulCount: number;
}

const isUnsafeProperty = (key: string): boolean =>
  key === '__proto__' || key === 'constructor' || key === 'prototype';

/**
 * Flattens a nested document into dot-notation key → primitive-value pairs.
 * Arrays are kept as-is (not recursed into) so array values are preserved.
 */
export const flattenDoc = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
  const result = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (!isUnsafeProperty(key)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenDoc(value as Record<string, unknown>, path));
      } else {
        result[path] = value;
      }
    }
  }
  return result;
};

/**
 * Lists every field path in a document in dot notation, descending into arrays of objects
 * (the structure the package field generator also expands) while keeping primitive arrays as leaves.
 */
export const collectFieldPaths = (obj: Record<string, unknown>, prefix = ''): string[] => {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (!isUnsafeProperty(key)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(value)) {
        const objectItems = value.filter(
          (item): item is Record<string, unknown> =>
            item != null && typeof item === 'object' && !Array.isArray(item)
        );
        if (objectItems.length > 0) {
          const childPaths = new Set<string>();
          for (const item of objectItems) {
            for (const childPath of collectFieldPaths(item, path)) {
              childPaths.add(childPath);
            }
          }
          paths.push(...childPaths);
        } else {
          paths.push(path);
        }
      } else if (value != null && typeof value === 'object') {
        paths.push(...collectFieldPaths(value as Record<string, unknown>, path));
      } else {
        paths.push(path);
      }
    }
  }
  return paths;
};

export const processSimulationResults = (
  response: estypes.IngestSimulateResponse,
  samples: string[]
): SimulationResults => {
  const failedSamples: FailedSample[] = [];
  const successfulDocuments: Array<Record<string, unknown>> = [];
  let successfulCount = 0;

  response.docs.forEach((doc, index) => {
    if (!doc) {
      failedSamples.push({
        sampleIndex: index,
        sample: samples[index],
        error: 'Document was dropped by the pipeline',
      });
    } else if (doc.error) {
      failedSamples.push({
        sampleIndex: index,
        sample: samples[index],
        error: doc.error.reason ?? doc.error.type ?? JSON.stringify(doc.error),
      });
    } else if (doc.doc?._source?.error) {
      const errorDetail =
        typeof doc.doc._source.error === 'string'
          ? doc.doc._source.error
          : JSON.stringify(doc.doc._source.error);
      failedSamples.push({
        sampleIndex: index,
        sample: samples[index],
        error: errorDetail,
      });
    } else if (doc.doc?._source) {
      successfulCount++;
      successfulDocuments.push(doc.doc._source);
    }
  });

  return { failedSamples, successfulDocuments, successfulCount };
};
