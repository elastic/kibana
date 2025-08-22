/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import type { FlattenRecord, SampleDocument } from '@kbn/streams-schema';
import { isPlainObject, uniq } from 'lodash';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { SimulationContext } from './types';
import { getFilterSimulationDocumentsFn } from './utils';

/**
 * Selects the documents used for the data preview table.
 */
export const selectPreviewRecords = createSelector(
  [
    (context: Pick<SimulationContext, 'samples'>) => context.samples,
    (context: Pick<SimulationContext, 'previewDocsFilter'>) => context.previewDocsFilter,
    (context: Pick<SimulationContext, 'simulation'>) => context.simulation?.documents,
  ],
  (samples, previewDocsFilter, documents) => {
    if (!previewDocsFilter || !documents) {
      return samples.map((sample) => flattenObjectNestedLast(sample.document)) as FlattenRecord[];
    }
    const filterFn = getFilterSimulationDocumentsFn(previewDocsFilter);
    return documents.filter(filterFn).map((doc) => doc.value);
  }
);

export const selectOriginalPreviewRecords = createSelector(
  [
    (context: SimulationContext) => context.samples,
    (context: SimulationContext) => context.previewDocsFilter,
    (context: SimulationContext) => context.simulation?.documents,
  ],
  (samples, previewDocsFilter, documents) => {
    if (!previewDocsFilter || !documents) {
      return samples;
    }
    const filterFn = getFilterSimulationDocumentsFn(previewDocsFilter);
    // return the samples where the filterFn matches the documents at the same index
    return samples.filter((_, index) => filterFn(documents[index]));
  }
);

export const selectHasSimulatedRecords = createSelector(
  [(context: SimulationContext) => context.simulation?.documents],
  (documents) => {
    return Boolean(documents && documents.length > 0);
  }
);

/**
 * Selects the set of dotted fields that are not supported by the current simulation.
 */
export const selectUnsupportedDottedFields = createSelector(
  [(context: SimulationContext) => context.samples],
  (samples) => {
    const properties = samples.flatMap((sample) => getDottedFieldPrefixes(sample.document));

    return uniq(properties);
  }
);

const isPlainObj = isPlainObject as (value: unknown) => value is Record<string, unknown>;

/**
 * Returns a list of all dotted properties prefixes in the given object.
 */
function getDottedFieldPrefixes(obj: SampleDocument): string[] {
  const result: string[] = [];

  function traverse(currentObj: SampleDocument, path: string[]): boolean {
    let foundDot = false;

    for (const key in currentObj) {
      if (Object.hasOwn(currentObj, key)) {
        const value = currentObj[key];
        const newPath = [...path, key];

        // Check if current key contains a dot
        if (key.includes('.')) {
          const newKey = newPath.join('.');
          // For objects with dotted keys, add trailing dot
          if (isPlainObj(value)) {
            result.push(newKey.concat('.'));
          } else {
            result.push(newKey);
          }
          foundDot = true;
          continue; // Skip further traversal for this key
        }

        // If it's an object, traverse deeper
        if (isPlainObj(value) && traverse(value, newPath)) {
          // If traversal found a dot, don't continue with siblings
          foundDot = true;
          continue;
        }
      }
    }

    return foundDot;
  }

  traverse(obj, []);

  return result;
}
